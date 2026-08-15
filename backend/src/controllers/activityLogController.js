const { pool } = require('../config/db');

/** GET /api/activity-logs — admin เท่านั้น: ดู audit trail ล่าสุด (?limit= ไม่บังคับ, สูงสุด 200) */
async function listActivityLogs(req, res) {
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  try {
    const [rows] = await pool.query(
      `SELECT l.log_id, l.user_id, u.username, u.full_name, l.action, l.table_name, l.record_id, l.detail, l.created_at
       FROM activity_logs l
       LEFT JOIN users u ON u.user_id = l.user_id
       ORDER BY l.log_id DESC
       LIMIT ?`,
      [limit]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[ActivityLog] listActivityLogs error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { listActivityLogs };
