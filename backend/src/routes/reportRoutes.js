const express = require('express');
const router = express.Router();
const {
  getSummary,
  getBreedingPlanReport,
  getPestDiseaseReport,
  listSeedlingTraceability,
  getSeedlingTraceability,
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');

// รายงานทุกแบบเป็นข้อมูลอ่านอย่างเดียว เปิดให้ทุก role ที่ login แล้วดูได้
// (ตรงกับ DFD: ผู้ดูแลระบบ/เจ้าของสวนกำหนดเงื่อนไขรายงาน แต่ไม่ได้ห้าม staff เข้าดู)
router.use(authenticate);

router.get('/summary', getSummary);
router.get('/breeding-plans', getBreedingPlanReport);
router.get('/pest-disease', getPestDiseaseReport);
router.get('/seedling-traceability', listSeedlingTraceability);
router.get('/seedling-traceability/:id', getSeedlingTraceability);

module.exports = router;
