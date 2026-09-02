import db from './src/db';

async function diagnose() {
  try {
    const [instansi] = await db.query('SELECT id, nama FROM instansi');
    console.log('--- INSTANSI ---');
    console.log(JSON.stringify(instansi, null, 2));

    const [adminSritanjung] = await db.query('SELECT id, username, instansi_id FROM admin WHERE username LIKE "%sritanjung%"');
    console.log('\n--- ADMIN SRITANJUNG ---');
    console.log(JSON.stringify(adminSritanjung, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

diagnose();
