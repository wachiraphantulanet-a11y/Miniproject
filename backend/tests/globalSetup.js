// รันครั้งเดียวก่อน test suite ทั้งหมด — สร้างฐานข้อมูลทดสอบใหม่ทุกครั้ง (DROP + import schema.sql)
// แล้วตั้งรหัสผ่าน admin ให้รู้ค่าแน่นอนสำหรับใช้ login ในเทสต์
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const REAL_DB_NAME = process.env.DB_NAME || 'mango_breeding_db';
const TEST_DB_NAME = `${REAL_DB_NAME}_test`;
const TEST_ADMIN_PASSWORD = 'Test@12345';

module.exports = async function globalSetup() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  await conn.query(`DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\``);

  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schemaSql = fs
    .readFileSync(schemaPath, 'utf8')
    .split(REAL_DB_NAME)
    .join(TEST_DB_NAME);

  await conn.query(schemaSql);

  const passwordHash = await bcrypt.hash(TEST_ADMIN_PASSWORD, 10);
  await conn.query(`UPDATE \`${TEST_DB_NAME}\`.users SET password_hash = ? WHERE username = 'admin'`, [
    passwordHash,
  ]);

  await conn.end();

  // เผื่อไฟล์ทดสอบอยากอ้างอิงรหัสผ่านที่ใช้ตั้งไว้
  process.env.TEST_ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
};
