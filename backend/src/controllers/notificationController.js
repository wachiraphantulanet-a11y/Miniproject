const { pool } = require('../config/db');

/** GET /api/notifications — login: ?unreadOnly=true กรองเฉพาะที่ยังไม่อ่าน */
async function listNotifications(req, res) {
  const { unreadOnly } = req.query;
  const conditions = ['user_id = ?'];
  const params = [req.user.userId];

  if (unreadOnly === 'true') {
    conditions.push('is_read = 0');
  }

  try {
    const [rows] = await pool.query(
      `SELECT notification_id, type, message, related_table, related_id, is_read, created_at
       FROM notifications
       WHERE ${conditions.join(' AND ')}
       ORDER BY notification_id DESC
       LIMIT 100`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[Notification] listNotifications error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/notifications/unread-count — login */
async function getUnreadCount(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS unreadCount FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.userId]
    );
    return res.json({ unreadCount: rows[0].unreadCount });
  } catch (err) {
    console.error('[Notification] getUnreadCount error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/notifications/:id/read — login: อ่านได้เฉพาะของตัวเอง */
async function markAsRead(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?',
      [id, req.user.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบการแจ้งเตือนนี้' });
    }
    return res.json({ message: 'อัปเดตสถานะการแจ้งเตือนสำเร็จ' });
  } catch (err) {
    console.error('[Notification] markAsRead error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/notifications/read-all — login */
async function markAllAsRead(req, res) {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.user.userId]);
    return res.json({ message: 'อัปเดตสถานะการแจ้งเตือนทั้งหมดสำเร็จ' });
  } catch (err) {
    console.error('[Notification] markAllAsRead error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { listNotifications, getUnreadCount, markAsRead, markAllAsRead };
