const express = require('express');
const router = express.Router();
const { getSummary, getAttendanceChart, getSubscriptionReport, getStaffAttendanceSummary, exportCSV } = require('../controllers/reportsController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/summary', getSummary);
router.get('/attendance', getAttendanceChart);
router.get('/subscriptions', getSubscriptionReport);
router.get('/staff-attendance', getStaffAttendanceSummary);
router.get('/export/csv', exportCSV);

module.exports = router;
