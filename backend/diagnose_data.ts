import db from './src/db';

async function diagnose() {
  try {
    const [users] = await db.query('SELECT username, role, instansi_id FROM app_users');
    console.log('--- ALL USERS ---');
    console.log(JSON.stringify(users, null, 2));

    const [instansi] = await db.query('SELECT * FROM instansi');
    console.log('\n--- ALL INSTANSI ---');
    console.log(JSON.stringify(instansi, null, 2));

    const [karyawans] = await db.query('SELECT k.id, k.nama, k.instansi_id, i.nama as instansi_nama FROM karyawan k LEFT JOIN instansi i ON k.instansi_id = i.id');
    console.log('\n--- ALL KARYAWAN ---');
    console.log(JSON.stringify(karyawans, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

diagnose();
