const { pool } = require('../config/db');

/**
 * สร้างการแจ้งเตือนในระบบให้ผู้ใช้คนเดียว (in-app notification)
 * แยก try/catch จาก flow หลัก เพราะการแจ้งเตือนไม่ควรทำให้ request หลักล้มเหลว
 */
async function notifyUser({ userId, type, message, relatedTable = null, relatedId = null }) {
  if (!userId) return;
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, related_table, related_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, type, message, relatedTable, relatedId]
    );
  } catch (err) {
    console.error('[Notify] สร้างการแจ้งเตือนไม่สำเร็จ:', err.message);
  }
}

/** แจ้งเตือนผู้ใช้ทุกคนที่มี role ตามที่ระบุ (เช่น แจ้ง admin/owner เมื่อพบโรค/แมลง) */
async function notifyRoles({ roles, type, message, relatedTable = null, relatedId = null, excludeUserId = null }) {
  try {
    const placeholders = roles.map(() => '?').join(',');
    const [users] = await pool.query(
      `SELECT u.user_id FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE r.role_name IN (${placeholders}) AND u.status = 'active'`,
      roles
    );
    await Promise.all(
      users
        .filter((u) => !excludeUserId || String(u.user_id) !== String(excludeUserId))
        .map((u) => notifyUser({ userId: u.user_id, type, message, relatedTable, relatedId }))
    );
  } catch (err) {
    console.error('[Notify] แจ้งเตือนตาม role ไม่สำเร็จ:', err.message);
  }
}

module.exports = { notifyUser, notifyRoles };
