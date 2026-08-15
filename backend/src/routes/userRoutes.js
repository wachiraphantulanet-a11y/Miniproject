const express = require('express');
const router = express.Router();
const {
  listUsers,
  getUser,
  createUser,
  updateUser,
  resetPassword,
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ทุก endpoint ในไฟล์นี้ต้อง login ก่อน และต้องเป็น 'admin' เท่านั้น
// (ตรงกับ DFD: ผู้ดูแลระบบเป็นผู้จัดการ "ข้อมูลบัญชีผู้ใช้งาน")
router.use(authenticate, authorize('admin'));

router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/password', resetPassword);

module.exports = router;
