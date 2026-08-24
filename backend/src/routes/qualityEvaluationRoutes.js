const express = require('express');
const router = express.Router();
const {
  listEvaluations,
  getEvaluation,
  createEvaluation,
  decideEvaluation,
} = require('../controllers/qualityEvaluationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ทุก endpoint ต้อง login ก่อน
router.use(authenticate);

// ดูข้อมูลได้ทุก role ที่ login แล้ว (admin, staff, owner)
router.get('/', listEvaluations);
router.get('/:id', getEvaluation);

// สร้าง — admin, staff (ตรงกับ DFD: เจ้าหน้าที่เพาะพันธุ์ประเมินคุณภาพต้นกล้า)
// ไม่มี PUT/submit: ผลประเมินแก้ไขไม่ได้หลังสร้าง ถ้าถูกปฏิเสธ (สถานะจบ) ต้องสร้างรายการใหม่แทน
router.post('/', authorize('admin', 'staff'), createEvaluation);

// อนุมัติ/ปฏิเสธ — admin, owner (ตรงกับ DFD: เจ้าของสวนพิจารณาผลการประเมินคุณภาพ — แก้ Gap 1)
router.post('/:id/decide', authorize('admin', 'owner'), decideEvaluation);

module.exports = router;
