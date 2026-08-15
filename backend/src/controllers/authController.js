const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { signToken } = require('../utils/token');
const { logActivity } = require('../utils/activityLog');

/**
 * POST /api/auth/login
 * body: { username, password }
 * ตรงกับ DFD Process 1: เข้าสู่ระบบและตรวจสอบสิทธิ์
 */
async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.username, u.password_hash, u.full_name, u.status,
              r.role_id, r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.username = ?`,
      [username]
    );

    const user = rows[0];

    // จงใจใช้ข้อความ error แบบเดียวกันทั้งกรณี "ไม่พบ user" และ "รหัสผ่านผิด"
    // เพื่อไม่ให้คนภายนอกเดาได้ว่า username ไหนมีอยู่จริงในระบบ
    if (!user) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = signToken({
      userId: user.user_id,
      username: user.username,
      role: user.role_name,
    });

    await logActivity({
      userId: user.user_id,
      action: 'LOGIN',
      tableName: 'users',
      recordId: user.user_id,
    });

    return res.json({
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        fullName: user.full_name,
        role: user.role_name,
      },
    });
  } catch (err) {
    console.error('[Auth] login error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/**
 * GET /api/auth/me
 * คืนข้อมูลผู้ใช้ปัจจุบันจาก token (ใช้ตอนโหลดหน้าเว็บใหม่เพื่อเช็คว่ายัง login อยู่ไหม)
 */
async function me(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.username, u.full_name, u.email, u.phone, u.status, r.role_name
       FROM users u JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = ?`,
      [req.user.userId]
    );
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบผู้ใช้งานนี้' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[Auth] me error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { login, me };
