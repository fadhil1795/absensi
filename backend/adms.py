"""
ADMS Server - ZKTeco iClock Protocol
Created for: Multi-Instansi Attendance System
Updated: 2026-01-30
"""

import os
import sys
import logging
import hashlib
from datetime import datetime
import pymysql
from flask import Flask, request, Response, render_template, redirect, url_for, session

# ==============================================================================
# 1. SYSTEM INITIALIZATION (CRITICAL FIX)
# ==============================================================================
# Kita wajib membuat folder logs SEBELUM konfigurasi logging dijalankan
# untuk menghindari FileNotFoundError.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(BASE_DIR, 'logs')
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')

os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(TEMPLATE_DIR, exist_ok=True)

# Konfigurasi Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, 'adms_server.log')),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("ADMS-Core")

app = Flask(__name__, template_folder=TEMPLATE_DIR)
app.secret_key = 'secret-key-project-2026'  # Ganti dengan key yang acak dan aman

# ==============================================================================
# 2. DATABASE CONFIGURATION
# ==============================================================================
DB_CONFIG = {
    'host': '103.92.209.102',
    'user': 'dev',
    'password': 'dev1745',       # Sesuaikan password database Anda
    'database': 'adms_absensi',  # Sesuaikan nama database Anda
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'autocommit': True
}

def get_db_connection():
    """Membuat koneksi ke database dengan error handling."""
    try:
        conn = pymysql.connect(**DB_CONFIG)
        return conn
    except pymysql.MySQLError as e:
        logger.error(f"Gagal koneksi database: {e}")
        return None

# ==============================================================================
# 3. HELPER FUNCTIONS (Logika Bisnis)
# ==============================================================================
def get_or_create_mesin(sn, ip_address):
    """
    Mengecek apakah mesin sudah terdaftar.
    Jika belum, akan didaftarkan otomatis ke instansi default.
    Jika sudah, update status 'last_seen' dan IP Address.
    """
    conn = get_db_connection()
    if not conn:
        return None, None

    try:
        with conn.cursor() as cur:
            # 1. Cek apakah SN ada
            cur.execute("SELECT id, instansi_id FROM mesin WHERE sn = %s", (sn,))
            mesin = cur.fetchone()

            if mesin:
                # Update status online
                cur.execute("""
                    UPDATE mesin
                    SET ip_address = %s, last_seen = NOW(), status = 'online'
                    WHERE id = %s
                """, (ip_address, mesin['id']))
                return mesin['id'], mesin['instansi_id']
            else:
                # 2. Jika mesin baru, cari Instansi ID Default (ID pertama)
                cur.execute("SELECT id FROM instansi ORDER BY id ASC LIMIT 1")
                instansi = cur.fetchone()

                # Fallback jika tabel instansi kosong, set NULL atau handle error
                instansi_id = instansi['id'] if instansi else 1

                # Register mesin baru
                logger.info(f"Mendaftarkan mesin baru: {sn}")
                cur.execute("""
                    INSERT INTO mesin (instansi_id, sn, nama_mesin, ip_address, lokasi, last_seen, status, created_at)
                    VALUES (%s, %s, %s, %s, 'Auto Register', NOW(), 'online', NOW())
                """, (instansi_id, sn, f"Mesin-{sn}", ip_address))

                return cur.lastrowid, instansi_id
    except Exception as e:
        logger.error(f"Error di get_or_create_mesin: {e}")
        return None, None
    finally:
        conn.close()

# ==============================================================================
# 4. ADMS PROTOCOL ROUTES (Inti Komunikasi Mesin)
# ==============================================================================

@app.route('/iclock/cdata', methods=['GET', 'POST'])
def iclock_cdata():
    """
    Endpoint utama penerimaan data log absensi (ATTLOG) dan user.
    """
    sn = request.args.get('SN', '').strip()
    table = request.args.get('table', '').strip()
    ip = request.remote_addr

    # Validasi SN
    if not sn:
        return Response("SN required", status=400)

    # Pastikan mesin terdaftar/terupdate statusnya
    mesin_id, instansi_id = get_or_create_mesin(sn, ip)

    # Jika method GET (Handshake awal)
    if request.method == 'GET':
        return Response("OK", mimetype='text/plain')

    # Jika method POST (Pengiriman data)
    raw_data = request.get_data(as_text=True).strip()
    if not raw_data:
        return Response("OK", mimetype='text/plain')

    conn = get_db_connection()
    if not conn:
        return Response("Database Error", status=500)

    try:
        with conn.cursor() as cur:
            # --- HANDLE LOG ABSENSI (ATTLOG) ---
            if table.upper() == 'ATTLOG':
                count_success = 0
                for line in raw_data.splitlines():
                    # Format: PIN [tab] Waktu [tab] Status [tab] Verify
                    parts = line.split('\t')
                    if len(parts) >= 2:
                        pin = parts[0].strip()
                        waktu_str = parts[1].strip()

                        # Parsing status & verify (default 0 jika tidak ada)
                        status = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0
                        verify = int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 0

                        try:
                            # Validasi format waktu
                            scan_time = datetime.strptime(waktu_str, '%Y-%m-%d %H:%M:%S')

                            # Insert ke DB (Gunakan INSERT IGNORE untuk skip duplikat)
                            # Pastikan kolom sesuai dengan skema tabel Anda
                            sql = """
                                INSERT IGNORE INTO absensi
                                (instansi_id, mesin_id, pin, scan_time, status, verify, created_at)
                                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                            """
                            cur.execute(sql, (instansi_id, mesin_id, pin, scan_time, status, verify))
                            count_success += 1
                        except ValueError:
                            logger.warning(f"Format tanggal salah dari {sn}: {waktu_str}")
                            continue

                # Update timestamp sinkronisasi terakhir mesin
                if count_success > 0:
                    cur.execute("UPDATE mesin SET last_sync = NOW() WHERE id = %s", (mesin_id,))
                    logger.info(f"[{sn}] Berhasil menyimpan {count_success} data log.")

            # --- HANDLE DATA KARYAWAN (USER) ---
            elif table.upper() == 'USER':
                # Implementasi penyimpanan data user/karyawan jika diperlukan
                pass

        return Response("OK", mimetype='text/plain')

    except Exception as e:
        logger.error(f"Error processing cdata: {e}")
        return Response("ERROR", status=500)
    finally:
        conn.close()


@app.route('/iclock/fdata', methods=['GET', 'POST'])
def iclock_fdata():
    """
    FIX ERROR 404: Endpoint ini menangani upload foto (ATTPHOTO) atau bio-data.
    Meskipun kita tidak menyimpan fotonya, kita WAJIB merespon 'OK'.
    Jika merespon 404, mesin akan macet dan berhenti mengirim log absensi.
    """
    sn = request.args.get('SN', '').strip()
    table = request.args.get('table', '').strip()
    ip = request.remote_addr

    # Tetap update status mesin agar terlihat online
    get_or_create_mesin(sn, ip)

    if request.method == 'POST':
        # Kita log saja bahwa ada foto masuk, tapi tidak disimpan ke disk/db
        logger.info(f"[{sn}] Menerima data binary (Table: {table}). Mengirim respon OK.")
        return Response("OK", mimetype='text/plain')

    return Response("OK", mimetype='text/plain')


@app.route('/iclock/getrequest', methods=['GET'])
def getrequest():
    """
    Endpoint di mana mesin 'bertanya' apakah ada perintah dari server.
    Di sini kita bisa memaksa mesin untuk mengupload log baru.
    """
    sn = request.args.get('SN', '')

    # Perintah standar ADMS:
    # 1. Cek info mesin
    # 2. Minta log absensi (DATA QUERY ATTLOG)
    commands = "GET OPTION\r\nDATA QUERY ATTLOG\r\n"

    logger.debug(f"[{sn}] Mengirim command sync.")
    return Response(commands, mimetype='text/plain')


@app.route('/iclock/receive_attendance', methods=['POST'])
def receive_attendance():
    """Fallback untuk beberapa firmware mesin tipe baru."""
    return Response("OK", mimetype='text/plain')


# ==============================================================================
# 5. WEB DASHBOARD ROUTES (Minimal)
# ==============================================================================

@app.route('/')
def index():
    return "ADMS Server is Running. <a href='/status'>Cek Status</a>"

@app.route('/status')
def status():
    """Halaman sederhana untuk cek koneksi DB dan jumlah data."""
    conn = get_db_connection()
    db_status = "Terhubung" if conn else "Terputus"
    stats = {}

    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) as total FROM absensi")
                stats['absensi'] = cur.fetchone()['total']

                cur.execute("SELECT COUNT(*) as total FROM mesin WHERE status='online'")
                stats['mesin_online'] = cur.fetchone()['total']
        finally:
            conn.close()

    return f"""
    <h3>Server Status</h3>
    <ul>
        <li>Database: <strong>{db_status}</strong></li>
        <li>Total Absensi: {stats.get('absensi', 0)}</li>
        <li>Mesin Online: {stats.get('mesin_online', 0)}</li>
    </ul>
    """

# ==============================================================================
# 6. MAIN EXECUTION
# ==============================================================================
if __name__ == '__main__':
    # Pastikan berjalan di port 80 (membutuhkan akses root/sudo)
    print("Memulai ADMS Server di Port 80...")
    print(f"Log tersimpan di: {os.path.join(LOG_DIR, 'adms_server.log')}")

    try:
        app.run(host='0.0.0.0', port=80, debug=True, threaded=True, use_reloader=False)
    except PermissionError:
        print("ERROR: Gagal bind ke port 80. Harap jalankan script dengan 'sudo'.")






