import db from './src/db';

async function diagnose() {
  try {
    const [users] = await db.query('SELECT id, username, role, instansi_id FROM admin');
    console.log('--- ADMINS ---');
    console.log(JSON.stringify(users, null, 2));

    const [instansi] = await db.query('SELECT * FROM instansi');
    console.log('\n--- INSTANSI ---');
    console.log(JSON.stringify(instansi, null, 2));

    const [karyawans] = await db.query('SELECT id, nama, instansi_id FROM karyawan');
    console.log('\n--- KARYAWAN ---');
    console.log(JSON.stringify(karyawans, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

diagnose();
