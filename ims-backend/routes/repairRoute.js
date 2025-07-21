// ims-backend/routes/repairRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const repairController = require('../controllers/repairController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// Routes for repair orders
router.post('/', authCheck, roleCheck(adminAccess), repairController.createRepairOrder);
router.get('/', authCheck, repairController.getAllRepairOrders);
router.get('/:id', authCheck, repairController.getRepairOrderById);
router.patch('/:id/return', authCheck, roleCheck(adminAccess), repairController.returnItemsFromRepair);

// TODO: Add route for returning items from repair

module.exports = router;