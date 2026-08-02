/**
 * ใช้ครั้งแรกหลัง import schema.sql เพื่อตั้งรหัสผ่านจริงให้ user 'admin'
 * (ใน schema.sql ตั้ง password_hash ไว้เป็น placeholder เท่านั้น)
 *
 * วิธีใช้:
 *   node src/scripts/seedAdmin.js <รหัสผ่านใหม่>
 *   ตัวอย่าง: node src/scripts/seedAdmin.js Admin@12345
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

async function run() {
  const newPassword = process.argv[2];
  if (!newPassword || newPassword.length < 8) {
    console.error('กรุณาระบุรหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร) เช่น: node src/scripts/seedAdmin.js Admin@12345');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const [result] = await pool.query(
    `UPDATE users SET password_hash = ? WHERE username = 'admin'`,
    [passwordHash]
  );

  if (result.affectedRows === 0) {
    console.error('ไม่พบผู้ใช้ username = admin ในตาราง users (ตรวจสอบว่ารัน schema.sql แล้วหรือยัง)');
  } else {
    console.log('ตั้งรหัสผ่านใหม่ให้ user "admin" สำเร็จแล้ว');
  }

  await pool.end();
}

run();
