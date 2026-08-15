const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { logActivity } = require('../utils/activityLog');

const SALT_ROUNDS = 10;

/** GET /api/users — ผู้ดูแลระบบเท่านั้น */
async function listUsers(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.username, u.full_name, u.email, u.phone,
              u.status, u.created_at, r.role_id, r.role_name
       FROM users u JOIN roles r ON r.role_id = u.role_id
       ORDER BY u.user_id`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[User] listUsers error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/users/:id */
async function getUser(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.username, u.full_name, u.email, u.phone,
              u.status, u.created_at, r.role_id, r.role_name
       FROM users u JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบผู้ใช้งานนี้' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[User] getUser error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/users — ผู้ดูแลระบบเท่านั้น */
async function createUser(req, res) {
  const { username, password, fullName, email, phone, roleId } = req.body;

  if (!username || !password || !fullName || !roleId) {
    return res.status(400).json({
      message: 'กรุณากรอกข้อมูลให้ครบ (username, password, fullName, roleId)',
    });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
  }

  try {
    const [existing] = await pool.query('SELECT user_id FROM users WHERE username = ?', [username]);
    if (existing[0]) {
      return res.status(409).json({ message: 'มีชื่อผู้ใช้นี้อยู่แล้วในระบบ' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, email, phone, role_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [username, passwordHash, fullName, email || null, phone || null, roleId]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'CREATE',
      tableName: 'users',
      recordId: result.insertId,
      detail: `สร้างผู้ใช้งาน ${username}`,
    });

    return res.status(201).json({ userId: result.insertId, username, fullName, roleId, status: 'active' });
  } catch (err) {
    console.error('[User] createUser error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** PUT /api/users/:id — ผู้ดูแลระบบเท่านั้น: แก้ไขข้อมูล / เปลี่ยน role / ระงับบัญชี */
async function updateUser(req, res) {
  const { fullName, email, phone, roleId, status } = req.body;
  const { id } = req.params;

  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'status ต้องเป็น active หรือ inactive เท่านั้น' });
  }

  try {
    const [existing] = await pool.query('SELECT user_id FROM users WHERE user_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบผู้ใช้งานนี้' });

    await pool.query(
      `UPDATE users SET
         full_name = COALESCE(?, full_name),
         email     = COALESCE(?, email),
         phone     = COALESCE(?, phone),
         role_id   = COALESCE(?, role_id),
         status    = COALESCE(?, status)
       WHERE user_id = ?`,
      [fullName, email, phone, roleId, status, id]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'UPDATE',
      tableName: 'users',
      recordId: id,
      detail: JSON.stringify({ fullName, email, phone, roleId, status }),
    });

    return res.json({ message: 'อัปเดตข้อมูลผู้ใช้งานสำเร็จ' });
  } catch (err) {
    console.error('[User] updateUser error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** PUT /api/users/:id/password — ผู้ดูแลระบบตั้งรหัสผ่านใหม่ให้ผู้ใช้ */
async function resetPassword(req, res) {
  const { newPassword } = req.body;
  const { id } = req.params;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' });
  }

  try {
    const [existing] = await pool.query('SELECT user_id FROM users WHERE user_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบผู้ใช้งานนี้' });

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [passwordHash, id]);

    await logActivity({
      userId: req.user.userId,
      action: 'RESET_PASSWORD',
      tableName: 'users',
      recordId: id,
    });

    return res.json({ message: 'ตั้งรหัสผ่านใหม่สำเร็จ' });
  } catch (err) {
    console.error('[User] resetPassword error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { listUsers, getUser, createUser, updateUser, resetPassword };
