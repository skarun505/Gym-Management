const express = require('express');
const router = express.Router();
const { getAllItems, createItem, updateItem, deleteItem, getAlerts } = require('../controllers/inventoryController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/alerts', getAlerts);
router.get('/', getAllItems);
router.post('/', createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

module.exports = router;
