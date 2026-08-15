const express = require('express');
const router = express.Router();
const {
  listSeedlings,
  getSeedling,
  createSeedling,
  updateSeedling,
} = require('../controllers/seedlingController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ทุก endpoint ต้อง login ก่อน
router.use(authenticate);

// ดูข้อมูลได้ทุก role ที่ login แล้ว (admin, staff, owner)
router.get('/', listSeedlings);
router.get('/:id', getSeedling);

// บันทึก/แก้ไข — admin, staff (ตรงกับ DFD: เจ้าหน้าที่เพาะพันธุ์บันทึกข้อมูลต้นกล้า)
router.post('/', authorize('admin', 'staff'), createSeedling);
router.put('/:id', authorize('admin', 'staff'), updateSeedling);

module.exports = router;
