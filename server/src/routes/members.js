const express = require('express');
const router = express.Router();
const { getAllMembers, getMemberById, createMember, updateMember, deleteMember } = require('../controllers/membersController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/', getAllMembers);
router.post('/', createMember);
router.get('/:id', getMemberById);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);

module.exports = router;
