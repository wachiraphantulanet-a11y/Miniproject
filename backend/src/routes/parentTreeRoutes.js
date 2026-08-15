const express = require('express');
const router = express.Router();
const {
  listParentTrees,
  getParentTree,
  createParentTree,
  updateParentTree,
} = require('../controllers/parentTreeController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ทุก endpoint ต้อง login ก่อน
router.use(authenticate);

// ดูข้อมูลได้ทุก role ที่ login แล้ว (admin, staff, owner)
router.get('/', listParentTrees);
router.get('/:id', getParentTree);

// เพิ่ม/แก้ไข ได้เฉพาะ admin และ staff (ตรงกับ DFD: เจ้าหน้าที่เพาะพันธุ์บันทึกข้อมูลต้นพ่อ-แม่พันธุ์)
router.post('/', authorize('admin', 'staff'), createParentTree);
router.put('/:id', authorize('admin', 'staff'), updateParentTree);

module.exports = router;
