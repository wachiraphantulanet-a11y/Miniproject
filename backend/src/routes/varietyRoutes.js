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

// เพิ่ม/แก้ไข/ลบ ได้เฉพาะ admin เท่านั้น
router.post('/', authorize('admin'), createVariety);
router.put('/:id', authorize('admin'), updateVariety);
router.delete('/:id', authorize('admin'), deleteVariety);

module.exports = router;
