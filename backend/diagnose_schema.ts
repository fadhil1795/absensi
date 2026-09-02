import db from './src/db';

async function diagnose() {
  try {
    const [colsUsers] = await db.query('DESCRIBE app_users');
    console.log('--- Columns in app_users ---');
    console.log(JSON.stringify(colsUsers, null, 2));

    const [colsKaryawan] = await db.query('DESCRIBE karyawan');
    console.log('--- Columns in karyawan ---');
    console.log(JSON.stringify(colsKaryawan, null, 2));

    const [allInstansi] = await db.query('SELECT * FROM instansi');
    console.log('--- All Instansi ---');
    console.log(JSON.stringify(allInstansi, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

diagnose();
