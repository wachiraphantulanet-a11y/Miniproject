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

// เพิ่ม/แก้ไข ได้เฉพาะ admin เท่านั้น
router.post('/', authorize('admin'), createParentTree);
router.put('/:id', authorize('admin'), updateParentTree);

module.exports = router;
