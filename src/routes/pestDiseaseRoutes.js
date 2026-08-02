const express = require('express');
const router = express.Router();
const {
  listPestDiseaseRecords,
  getPestDiseaseRecord,
  createPestDiseaseRecord,
  updatePestDiseaseRecord,
} = require('../controllers/pestDiseaseController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ทุก endpoint ต้อง login ก่อน
router.use(authenticate);

// ดูข้อมูลได้ทุก role ที่ login แล้ว (admin, staff, owner)
router.get('/', listPestDiseaseRecords);
router.get('/:id', getPestDiseaseRecord);

// บันทึก/แก้ไข — admin, staff (ตรงกับ DFD + แก้ Gap 2: บันทึกปัญหาโรค/แมลงระหว่างดูแลต้นกล้า)
router.post('/', authorize('admin', 'staff'), createPestDiseaseRecord);
router.put('/:id', authorize('admin', 'staff'), updatePestDiseaseRecord);

module.exports = router;
