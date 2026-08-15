const express = require('express');
const router = express.Router();
const {
  listCareRecords,
  getCareRecord,
  createCareRecord,
  updateCareRecord,
} = require('../controllers/careController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ทุก endpoint ต้อง login ก่อน
router.use(authenticate);

// ดูข้อมูลได้ทุก role ที่ login แล้ว (admin, staff, owner)
router.get('/', listCareRecords);
router.get('/:id', getCareRecord);

// บันทึก/แก้ไข — admin, staff (ตรงกับ DFD: เจ้าหน้าที่เพาะพันธุ์ติดตามการดูแลและการเจริญเติบโต)
router.post('/', authorize('admin', 'staff'), createCareRecord);
router.put('/:id', authorize('admin', 'staff'), updateCareRecord);

module.exports = router;
