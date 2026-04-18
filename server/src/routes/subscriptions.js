const express = require('express');
const router = express.Router();
const { getPlans, createPlan, getAllSubscriptions, assignPlan, updateSubscription, getExpiring } = require('../controllers/subscriptionsController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.get('/expiring', getExpiring);
router.get('/', getAllSubscriptions);
router.post('/', assignPlan);
router.put('/:id', updateSubscription);

module.exports = router;
