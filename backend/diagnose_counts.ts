import db from './src/db';

async function diagnose() {
  try {
    const [users] = await db.query('SELECT a.id, a.username, a.role, a.instansi_id, i.nama as instansi_nama FROM admin a LEFT JOIN instansi i ON a.instansi_id = i.id');
    console.log('--- ADMIN USERS ---');
    console.log(JSON.stringify(users, null, 2));

    const [karyawans] = await db.query('SELECT instansi_id, COUNT(*) as count FROM karyawan GROUP BY instansi_id');
    console.log('\n--- KARYAWAN PER INSTANSI ---');
    console.log(JSON.stringify(karyawans, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

diagnose();
