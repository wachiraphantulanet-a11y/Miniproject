const express = require('express');
const router = express.Router();
const { listRoles } = require('../controllers/roleController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, listRoles);

module.exports = router;
