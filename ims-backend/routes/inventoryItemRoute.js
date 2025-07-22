// ims-backend/routes/inventoryItemRoute.js

const express = require('express');
const router = express.Router();

const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const {
    addInventoryItem,
    getAllInventoryItems,
    getInventoryItemById,
    updateInventoryItem,
    deleteInventoryItem,
    getAssetHistory,
    decommission, // <-- แก้ไขเป็นฟังก์ชันเดียว
    reinstate     // <-- แก้ไขเป็นฟังก์ชันเดียว
} = require('../controllers/inventoryItemController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

router.get('/', getAllInventoryItems);
router.get('/:id', getInventoryItemById);
router.get('/:id/history', authCheck, getAssetHistory);

router.post('/', authCheck, roleCheck(adminAccess), addInventoryItem);
router.put('/:id', authCheck, roleCheck(adminAccess), updateInventoryItem);
router.delete('/:id', authCheck, roleCheck(adminAccess), deleteInventoryItem);

// --- START: แก้ไข Routes ---
router.patch('/:id/decommission', authCheck, roleCheck(adminAccess), inventoryController.decommissionItem);
router.patch('/:id/reinstate', authCheck, roleCheck(adminAccess), inventoryController.reinstateItem);

router.patch('/:id/reserve', authCheck, roleCheck(adminAccess), inventoryController.markAsReserved);
router.patch('/:id/unreserve', authCheck, roleCheck(adminAccess), inventoryController.unreserveItem);
router.patch('/:id/defect', authCheck, roleCheck(adminAccess), inventoryController.markAsDefective);

// --- START: เพิ่ม Route ใหม่ ---
router.patch('/:id/in-stock', authCheck, roleCheck(adminAccess), inventoryController.markAsInStock);
// --- END: เพิ่ม Route ใหม่ ---


module.exports = router;