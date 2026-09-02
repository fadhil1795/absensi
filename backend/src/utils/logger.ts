import db from '../db';

export const logAction = async (
    userId: number | null,
    userName: string | null,
    action: string,
    details: any,
    ipAddress: string | null = '-'
) => {
    try {
        const sql = `
            INSERT INTO audit_logs (user_id, user_name, action, details, ip_address)
            VALUES (?, ?, ?, ?, ?)
        `;
        const detailStr = typeof details === 'string' ? details : JSON.stringify(details);

        await db.query(sql, [userId, userName, action, detailStr, ipAddress]);
    } catch (error) {
        console.error('Failed to write audit log:', error);
        // Don't throw, so we don't break the main flow
    }
};
