const express = require('express');
const router = express.Router();
const {
  listPollinations,
  getPollination,
  createPollination,
  updatePollination,
} = require('../controllers/pollinationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ทุก endpoint ต้อง login ก่อน
router.use(authenticate);

// ดูข้อมูลได้ทุก role ที่ login แล้ว (admin, staff, owner)
router.get('/', listPollinations);
router.get('/:id', getPollination);

// บันทึก/แก้ไข — admin, staff (ตรงกับ DFD: เจ้าหน้าที่เพาะพันธุ์บันทึกการผสมเกสร)
router.post('/', authorize('admin', 'staff'), createPollination);
router.put('/:id', authorize('admin', 'staff'), updatePollination);

module.exports = router;
