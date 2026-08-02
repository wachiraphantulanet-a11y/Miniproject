const express = require('express');
const router = express.Router();
const {
  listEvaluations,
  getEvaluation,
  createEvaluation,
  updateEvaluation,
  submitEvaluation,
  decideEvaluation,
} = require('../controllers/qualityEvaluationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ทุก endpoint ต้อง login ก่อน
router.use(authenticate);

// ดูข้อมูลได้ทุก role ที่ login แล้ว (admin, staff, owner)
router.get('/', listEvaluations);
router.get('/:id', getEvaluation);

// สร้าง/แก้ไข/ส่งกลับเข้ารออนุมัติ — admin, staff (ตรงกับ DFD: เจ้าหน้าที่เพาะพันธุ์ประเมินคุณภาพต้นกล้า)
router.post('/', authorize('admin', 'staff'), createEvaluation);
router.put('/:id', authorize('admin', 'staff'), updateEvaluation);
router.post('/:id/submit', authorize('admin', 'staff'), submitEvaluation);

// อนุมัติ/ปฏิเสธ — admin, owner (ตรงกับ DFD: เจ้าของสวนพิจารณาผลการประเมินคุณภาพ — แก้ Gap 1)
router.post('/:id/decide', authorize('admin', 'owner'), decideEvaluation);

module.exports = router;
