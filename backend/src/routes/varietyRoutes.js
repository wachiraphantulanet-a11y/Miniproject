const express = require('express');
const router = express.Router();
const {
  listVarieties,
  getVariety,
  createVariety,
  updateVariety,
  deleteVariety,
} = require('../controllers/varietyController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ทุก endpoint ต้อง login ก่อน
router.use(authenticate);

// ดูข้อมูลได้ทุก role ที่ login แล้ว (admin, staff, owner)
router.get('/', listVarieties);
router.get('/:id', getVariety);

// เพิ่ม/แก้ไข/ลบ ได้เฉพาะ admin และ staff (ตรงกับ DFD: เจ้าหน้าที่เพาะพันธุ์บันทึกข้อมูลพันธุ์มะม่วง)
router.post('/', authorize('admin', 'staff'), createVariety);
router.put('/:id', authorize('admin', 'staff'), updateVariety);
router.delete('/:id', authorize('admin', 'staff'), deleteVariety);

module.exports = router;
