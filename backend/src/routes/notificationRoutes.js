const express = require('express');
const router = express.Router();
const {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

// การแจ้งเตือนเป็นของส่วนตัวรายผู้ใช้ — ต้อง login เท่านั้น ไม่ต้องจำกัด role เพิ่ม
router.use(authenticate);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/:id/read', markAsRead);
router.post('/read-all', markAllAsRead);

module.exports = router;
