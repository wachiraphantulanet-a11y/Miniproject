const express = require('express');
const router = express.Router();
const {
  getSummary,
  listProcessTypes,
  listReportUsers,
  getProcessReport,
  listSeedlingTraceability,
  getSeedlingTraceability,
} = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// เมนูรายงานเปิดให้เฉพาะผู้ดูแลระบบ (admin) — staff/owner เข้าไม่ได้
router.use(authenticate, authorize('admin'));

router.get('/summary', getSummary);
router.get('/process-types', listProcessTypes);
router.get('/filter-users', listReportUsers);
router.get('/process', getProcessReport);
router.get('/seedling-traceability', listSeedlingTraceability);
router.get('/seedling-traceability/:id', getSeedlingTraceability);

module.exports = router;
