const express = require('express');
const router = express.Router();
const { listActivityLogs } = require('../controllers/activityLogController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// admin เท่านั้น — audit trail ดิบสำหรับแดชบอร์ดผู้ดูแลระบบ
router.use(authenticate, authorize('admin'));

router.get('/', listActivityLogs);

module.exports = router;
