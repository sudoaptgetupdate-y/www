// ims-backend/routes/inventoryRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const inventoryController = require('../controllers/inventoryController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// Routes for inventory items (for SALE)
router.get('/', authCheck, inventoryController.getAllInventoryItems);
router.get('/:id', authCheck, inventoryController.getInventoryItemById);
router.get('/:id/history', authCheck, inventoryController.getInventoryItemHistory); // <-- เพิ่มบรรทัดนี้

router.post('/', authCheck, roleCheck(adminAccess), inventoryController.addInventoryItem);
router.put('/:id', authCheck, roleCheck(adminAccess), inventoryController.updateInventoryItem);
router.delete('/:id', authCheck, roleCheck(adminAccess), inventoryController.deleteInventoryItem);

router.patch('/:id/decommission', authCheck, roleCheck(adminAccess), inventoryController.decommissionItem);
router.patch('/:id/reinstate', authCheck, roleCheck(adminAccess), inventoryController.reinstateItem);

module.exports = router;