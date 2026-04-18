const express = require('express');
const router = express.Router();
const { getAllStaff, createStaff, updateStaff, deleteStaff, assignTrainer, getAssignments } = require('../controllers/staffController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);
// Specific paths BEFORE /:id to avoid route conflicts
router.get('/assignments', getAssignments);
router.post('/assign', requireRole('admin'), assignTrainer);
router.get('/', getAllStaff);
router.post('/', requireRole('admin'), createStaff);
router.put('/:id', requireRole('admin'), updateStaff);
router.delete('/:id', requireRole('admin'), deleteStaff);

module.exports = router;
