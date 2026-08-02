const express = require('express');
const router = express.Router();
const {
  listFruitSets,
  getFruitSet,
  createFruitSet,
  updateFruitSet,
} = require('../controllers/fruitSetController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ทุก endpoint ต้อง login ก่อน
router.use(authenticate);

// ดูข้อมูลได้ทุก role ที่ login แล้ว (admin, staff, owner)
router.get('/', listFruitSets);
router.get('/:id', getFruitSet);

// บันทึก/แก้ไข — admin, staff (ตรงกับ DFD: เจ้าหน้าที่เพาะพันธุ์บันทึกการติดผล)
router.post('/', authorize('admin', 'staff'), createFruitSet);
router.put('/:id', authorize('admin', 'staff'), updateFruitSet);

module.exports = router;
