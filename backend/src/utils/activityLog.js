const { pool } = require('../config/db');

/**
 * บันทึก audit trail ลงตาราง activity_logs
 * ใช้ try/catch แยกจาก flow หลัก เพราะการบันทึก log ไม่ควรทำให้ request หลักล้มเหลว
 */
async function logActivity({ userId = null, action, tableName, recordId = null, detail = null }) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, table_name, record_id, detail)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, action, tableName, recordId, detail]
    );
  } catch (err) {
    console.error('[ActivityLog] บันทึก log ไม่สำเร็จ:', err.message);
  }
}

module.exports = { logActivity };
