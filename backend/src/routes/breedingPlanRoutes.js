const express = require('express');
const router = express.Router();
const {
  listBreedingPlans,
  getBreedingPlan,
  createBreedingPlan,
  updateBreedingPlan,
  submitBreedingPlan,
  decideBreedingPlan,
} = require('../controllers/breedingPlanController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ทุก endpoint ต้อง login ก่อน
router.use(authenticate);

// ดูข้อมูลได้ทุก role ที่ login แล้ว (admin, staff, owner)
router.get('/', listBreedingPlans);
router.get('/:id', getBreedingPlan);

// สร้าง/แก้ไข/ส่งอนุมัติ — admin, staff (ตรงกับ DFD: เจ้าหน้าที่เพาะพันธุ์จัดทำแผน)
router.post('/', authorize('admin', 'staff'), createBreedingPlan);
router.put('/:id', authorize('admin', 'staff'), updateBreedingPlan);
router.post('/:id/submit', authorize('admin', 'staff'), submitBreedingPlan);

// อนุมัติ/ปฏิเสธ — admin, owner (ตรงกับ DFD: เจ้าของสวนอนุมัติแผนการเพาะพันธุ์)
router.post('/:id/decide', authorize('admin', 'owner'), decideBreedingPlan);

module.exports = router;
