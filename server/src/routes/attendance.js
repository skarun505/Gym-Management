const express = require('express');
const router = express.Router();
const { getDailyLog, checkIn, checkOut, getMemberAttendance } = require('../controllers/attendanceController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/', getDailyLog);
router.post('/checkin', checkIn);
router.put('/:id/checkout', checkOut);
router.get('/member/:id', getMemberAttendance);

module.exports = router;
