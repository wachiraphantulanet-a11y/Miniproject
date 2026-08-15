const express = require('express');
const router = express.Router();
const {
  listSeeds,
  getSeed,
  createSeed,
  updateSeed,
} = require('../controllers/seedController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ทุก endpoint ต้อง login ก่อน
router.use(authenticate);

// ดูข้อมูลได้ทุก role ที่ login แล้ว (admin, staff, owner)
router.get('/', listSeeds);
router.get('/:id', getSeed);

// บันทึก/แก้ไข — admin, staff (ตรงกับ DFD: เจ้าหน้าที่เพาะพันธุ์บันทึกข้อมูลเมล็ดพันธุ์)
router.post('/', authorize('admin', 'staff'), createSeed);
router.put('/:id', authorize('admin', 'staff'), updateSeed);

module.exports = router;
