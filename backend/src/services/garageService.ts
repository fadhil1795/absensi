import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface GarageUploadResult {
    key: string;
    provider: 'garage' | 'local';
    url: string;
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: Buffer | string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function getSigningKey(secretAccessKey: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
    const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = hmacSha256(kDate, regionName);
    const kService = hmacSha256(kRegion, serviceName);
    return hmacSha256(kService, 'aws4_request');
}

function encodeS3URI(uriPath: string): string {
    return uriPath
        .split('/')
        .map(segment => encodeURIComponent(segment).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
        .join('/');
}

export const garageService = {
    isConfigured(): boolean {
        return Boolean(
            process.env.GARAGE_ENDPOINT &&
            process.env.GARAGE_BUCKET &&
            process.env.GARAGE_ACCESS_KEY_ID &&
            process.env.GARAGE_SECRET_ACCESS_KEY
        );
    },

    getConfig() {
        const endpoint = (process.env.GARAGE_ENDPOINT || 'http://127.0.0.1:3900').replace(/\/+$/, '');
        const region = process.env.GARAGE_REGION || 'garage';
        const bucket = process.env.GARAGE_BUCKET || 'absensi-leaves';
        const accessKeyId = process.env.GARAGE_ACCESS_KEY_ID || '';
        const secretAccessKey = process.env.GARAGE_SECRET_ACCESS_KEY || '';
        return { endpoint, region, bucket, accessKeyId, secretAccessKey };
    },

    /**
     * Build AWS Signature v4 headers for Garage HQ (path-style S3 request)
     */
    buildSignedRequest(method: 'PUT' | 'GET' | 'DELETE', objectKey: string, payload: Buffer | string = '', contentType?: string) {
        const { endpoint, region, bucket, accessKeyId, secretAccessKey } = this.getConfig();
        const urlObj = new URL(endpoint);
        const host = urlObj.host;

        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDD'T'HHMMSS'Z'
        const dateStamp = amzDate.substring(0, 8); // YYYYMMDD

        const cleanKey = objectKey.replace(/^\/+/, '');
        const basePath = urlObj.pathname.replace(/\/+$/, '');
        const canonicalUri = encodeS3URI(`${basePath}/${bucket}/${cleanKey}`);
        const canonicalQueryString = '';

        const payloadHash = sha256Hex(payload);

        const headersToSign: Record<string, string> = {
            host,
            'x-amz-content-sha256': payloadHash,
            'x-amz-date': amzDate
        };

        if (contentType) {
            headersToSign['content-type'] = contentType;
        }

        const sortedHeaderKeys = Object.keys(headersToSign).sort();
        const canonicalHeaders = sortedHeaderKeys.map(k => `${k}:${headersToSign[k].trim()}\n`).join('');
        const signedHeaders = sortedHeaderKeys.join(';');

        const canonicalRequest = [
            method,
            canonicalUri,
            canonicalQueryString,
            canonicalHeaders,
            signedHeaders,
            payloadHash
        ].join('\n');

        const algorithm = 'AWS4-HMAC-SHA256';
        const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
        const stringToSign = [
            algorithm,
            amzDate,
            credentialScope,
            sha256Hex(canonicalRequest)
        ].join('\n');

        const signingKey = getSigningKey(secretAccessKey, dateStamp, region, 's3');
        const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

        const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        const requestHeaders: Record<string, string> = {
            'x-amz-date': amzDate,
            'x-amz-content-sha256': payloadHash,
            Authorization: authorizationHeader
        };

        if (contentType) {
            requestHeaders['Content-Type'] = contentType;
        }

        const fullUrl = `${urlObj.protocol}//${urlObj.host}${canonicalUri}`;
        return { fullUrl, requestHeaders };
    },

    /**
     * Upload file buffer to Garage HQ (or local fallback if Garage env vars are not yet configured)
     */
    async uploadFile(objectKey: string, buffer: Buffer, contentType: string): Promise<GarageUploadResult> {
        const cleanKey = objectKey.replace(/^\/+/, '');

        if (this.isConfigured()) {
            const { fullUrl, requestHeaders } = this.buildSignedRequest('PUT', cleanKey, buffer, contentType);
            await axios.put(fullUrl, buffer, {
                headers: {
                    ...requestHeaders,
                    'Content-Length': String(buffer.length)
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

            return {
                key: cleanKey,
                provider: 'garage',
                url: fullUrl
            };
        }

        // Fallback to local uploads folder if Garage HQ is not configured yet
        const localDir = path.join(__dirname, '../../uploads', path.dirname(cleanKey));
        fs.mkdirSync(localDir, { recursive: true });
        const localFilePath = path.join(__dirname, '../../uploads', cleanKey);
        fs.writeFileSync(localFilePath, buffer);

        return {
            key: cleanKey,
            provider: 'local',
            url: `/uploads/${cleanKey}`
        };
    },

    /**
     * Get file buffer from Garage HQ (or local fallback)
     */
    async getFile(objectKey: string): Promise<{ buffer: Buffer; contentType?: string }> {
        const cleanKey = objectKey.replace(/^\/+/, '');

        if (this.isConfigured()) {
            try {
                const { fullUrl, requestHeaders } = this.buildSignedRequest('GET', cleanKey, '');
                const response = await axios.get(fullUrl, {
                    headers: requestHeaders,
                    responseType: 'arraybuffer'
                });
                return {
                    buffer: Buffer.from(response.data),
                    contentType: response.headers['content-type']
                };
            } catch (err) {
                // Check local fallback if object was previously stored locally
                const localFilePath = path.join(__dirname, '../../uploads', cleanKey);
                if (fs.existsSync(localFilePath)) {
                    return { buffer: fs.readFileSync(localFilePath) };
                }
                throw err;
            }
        }

        const localFilePath = path.join(__dirname, '../../uploads', cleanKey);
        if (!fs.existsSync(localFilePath)) {
            throw new Error('Attachment file not found');
        }
        return {
            buffer: fs.readFileSync(localFilePath)
        };
    },

    /**
     * Delete file from Garage HQ (and/or local fallback)
     */
    async deleteFile(objectKey: string): Promise<void> {
        if (!objectKey) return;
        const cleanKey = objectKey.replace(/^\/+/, '');

        if (this.isConfigured()) {
            try {
                const { fullUrl, requestHeaders } = this.buildSignedRequest('DELETE', cleanKey, '');
                await axios.delete(fullUrl, { headers: requestHeaders });
            } catch (err) {
                console.warn('[GarageService] Failed to delete object from Garage HQ:', err);
            }
        }

        const localFilePath = path.join(__dirname, '../../uploads', cleanKey);
        if (fs.existsSync(localFilePath)) {
            try {
                fs.unlinkSync(localFilePath);
            } catch (err) {
                console.warn('[GarageService] Failed to delete local file:', err);
            }
        }
    }
};

