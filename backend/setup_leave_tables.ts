import db from './src/db';

async function setupTables() {
  try {
    console.log('--- Setting up Leave Tables ---');
    
    // Create jenis_cuti table
    await db.query(`
      CREATE TABLE IF NOT EXISTS jenis_cuti (
        id INT AUTO_INCREMENT PRIMARY KEY,
        instansi_id INT NULL,
        nama VARCHAR(100) NOT NULL,
        kuota INT DEFAULT 12,
        is_paid TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "jenis_cuti" ensured.');

    // Create cuti table
    await db.query(`
      CREATE TABLE IF NOT EXISTS cuti (
        id INT AUTO_INCREMENT PRIMARY KEY,
        karyawan_id INT NOT NULL,
        jenis_cuti_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
        approved_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "cuti" ensured.');

    console.log('--- All tables ready! ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up tables:', error);
    process.exit(1);
  }
}

setupTables();
