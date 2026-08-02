const mysql = require('mysql2/promise');
require('dotenv').config();

// ใช้ connection pool แทนการเปิด-ปิด connection ทีละครั้ง
// เพื่อรองรับ concurrent request ได้ดีกว่า
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mango_breeding_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // ให้ค่า DATE/DATETIME กลับมาเป็น string ตรงๆ ไม่ต้องแปลง timezone เอง
});

// ทดสอบการเชื่อมต่อตอน start server ครั้งแรก จะได้เจอปัญหาเร็ว
// แทนที่จะไปพังตอน request แรกเข้ามา
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('[DB] เชื่อมต่อฐานข้อมูลสำเร็จ:', process.env.DB_NAME);
  } catch (err) {
    console.error('[DB] เชื่อมต่อฐานข้อมูลไม่สำเร็จ:', err.message);
    throw err;
  }
}

module.exports = { pool, testConnection };
