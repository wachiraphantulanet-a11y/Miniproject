const { pool } = require('../config/db');

/** GET /api/roles — ผู้ใช้ที่ login แล้วทุกคนดูได้ (ใช้ทำ dropdown) */
async function listRoles(req, res) {
  try {
    const [rows] = await pool.query('SELECT role_id, role_name, description FROM roles ORDER BY role_id');
    return res.json(rows);
  } catch (err) {
    console.error('[Role] listRoles error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { listRoles };
