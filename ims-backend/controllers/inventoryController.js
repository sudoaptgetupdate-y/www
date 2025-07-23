// ims-backend/controllers/inventoryController.js

const { PrismaClient, ItemType, EventType, ItemOwner } = require('@prisma/client');
const prisma = new PrismaClient();
const inventoryController = {};

const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

// Helper function to create event logs consistently
const createEventLog = (tx, inventoryItemId, userId, eventType, details) => {
    return tx.eventLog.create({
        data: {
            inventoryItemId,
            userId,
            eventType,
            details,
        },
    });
};

inventoryController.addInventoryItem = async (req, res, next) => {
    try {
        const { serialNumber, macAddress, productModelId } = req.body;
        const userId = req.user.id;

        if (typeof productModelId !== 'number') {
            const err = new Error('Product Model ID is required and must be a number.');
            err.statusCode = 400;
            return next(err);
        }
        if (macAddress && (typeof macAddress !== 'string' || !macRegex.test(macAddress))) {
            const err = new Error('Invalid MAC Address format.');
            err.statusCode = 400;
            return next(err);
        }

        const newItem = await prisma.$transaction(async (tx) => {
            const createdItem = await tx.inventoryItem.create({
                data: {
                    itemType: ItemType.SALE,
                    ownerType: ItemOwner.COMPANY,
                    serialNumber: serialNumber || null,
                    macAddress: macAddress || null,
                    productModelId,
                    addedById: userId,
                    status: 'IN_STOCK',
                },
            });

            await createEventLog(
                tx,
                createdItem.id,
                userId,
                EventType.CREATE,
                { details: `Item created with S/N: ${serialNumber || 'N/A'}.` }
            );
            
            return createdItem;
        });

        res.status(201).json(newItem);
    } catch (error) {
        next(error);
    }
};

inventoryController.getAllInventoryItems = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All';
        const categoryIdFilter = req.query.categoryId || 'All';
        const brandIdFilter = req.query.brandId || 'All';
        
        let where = { 
            itemType: ItemType.SALE
        };

        if (statusFilter && statusFilter !== 'All') {
            where.status = statusFilter;
        }

        if (searchTerm) {
            where.OR = [
                { serialNumber: { contains: searchTerm } },
                { macAddress: { equals: searchTerm } },
                { productModel: { modelNumber: { contains: searchTerm } } },
            ];
        }
        
        if (categoryIdFilter && categoryIdFilter !== 'All') {
            where.productModel = { ...where.productModel, categoryId: parseInt(categoryIdFilter) };
        }
        if (brandIdFilter && brandIdFilter !== 'All') {
            where.productModel = { ...where.productModel, brandId: parseInt(brandIdFilter) };
        }

        const include = {
            productModel: { include: { category: true, brand: true } },
            addedBy: { select: { name: true } },
            borrowingRecords: {
                where: { returnedAt: null },
                select: { borrowingId: true }
            },
            repairRecords: {
                orderBy: { sentAt: 'desc' },
                take: 1,
                select: { repairId: true }
            }
        };

        const [items, totalItems] = await prisma.$transaction([
            prisma.inventoryItem.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include }),
            prisma.inventoryItem.count({ where })
        ]);

        const formattedItems = items.map(item => {
            const activeBorrowing = item.borrowingRecords.length > 0 ? item.borrowingRecords[0] : null;
            const activeRepair = item.repairRecords.length > 0 ? item.repairRecords[0] : null;
            const { borrowingRecords, repairRecords, ...restOfItem } = item;
            return { 
                ...restOfItem, 
                borrowingId: activeBorrowing ? activeBorrowing.borrowingId : null,
                repairId: activeRepair ? activeRepair.repairId : null
            };
        });

        res.status(200).json({
            data: formattedItems,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });

    } catch (error) {
        next(error);
    }
};

inventoryController.getInventoryItemById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const itemId = parseInt(id);
        if (isNaN(itemId)) {
            const err = new Error('Invalid Item ID.');
            err.statusCode = 400;
            throw err;
        }

        const item = await prisma.inventoryItem.findFirst({
            where: { id: itemId, itemType: ItemType.SALE },
            include: { 
                productModel: { include: { category: true, brand: true } },
                addedBy: { select: { name: true } }
            }
        });
        if (!item) {
            const err = new Error('Inventory item not found');
            err.statusCode = 404;
            throw err;
        }
        res.status(200).json(item);
    } catch (error) {
        next(error);
    }
};

inventoryController.updateInventoryItem = async (req, res, next) => {
    const { id } = req.params;
    const actorId = req.user.id;
    try {
        const { serialNumber, macAddress, status, productModelId } = req.body;
        
        const itemId = parseInt(id);
        if (isNaN(itemId)) {
            const err = new Error('Invalid Item ID.');
            err.statusCode = 400;
            return next(err);
        }
        
        if (typeof productModelId !== 'number') {
            const err = new Error('Product Model ID is required and must be a number.');
            err.statusCode = 400;
            return next(err);
        }
        if (macAddress && (typeof macAddress !== 'string' || !macRegex.test(macAddress))) {
            const err = new Error('Invalid MAC Address format.');
            err.statusCode = 400;
            return next(err);
        }
        
        const [updatedItem] = await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: itemId, itemType: 'SALE' },
                data: {
                    serialNumber: serialNumber || null,
                    macAddress: macAddress || null,
                    status,
                    productModelId
                },
            }),
            createEventLog(
                prisma,
                itemId,
                actorId,
                EventType.UPDATE,
                { details: `Item details updated.` }
            )
        ]);

        res.status(200).json(updatedItem);
    } catch (error) {
        next(error);
    }
};

inventoryController.deleteInventoryItem = async (req, res, next) => {
    const { id } = req.params;
    try {
        const itemId = parseInt(id);
        if (isNaN(itemId)) {
            const err = new Error('Invalid Item ID.');
            err.statusCode = 400;
            throw err;
        }

        const itemToDelete = await prisma.inventoryItem.findFirst({
            where: { id: itemId, itemType: 'SALE' },
            include: { borrowingRecords: { where: { returnedAt: null } } }
        });

        if (!itemToDelete) {
             const err = new Error('Item not found.');
             err.statusCode = 404;
             throw err;
        }
        if (itemToDelete.status === 'SOLD' || itemToDelete.borrowingRecords.length > 0) {
            let reason = itemToDelete.status === 'SOLD' ? 'SOLD' : 'actively BORROWED';
            const err = new Error(`Cannot delete item. It is currently ${reason}.`);
            err.statusCode = 400;
            throw err;
        }

        await prisma.$transaction(async (tx) => {
            await tx.eventLog.deleteMany({ where: { inventoryItemId: itemId } });
            await tx.borrowingOnItems.deleteMany({ where: { inventoryItemId: itemId } });
            await tx.inventoryItem.delete({ where: { id: itemId } });
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

const updateItemStatus = async (res, req, next, expectedStatus, newStatus, eventType, details) => {
    const { id } = req.params;
    const actorId = req.user.id;
    try {
        const itemId = parseInt(id);
        if (isNaN(itemId)) {
            const err = new Error('Invalid Item ID.');
            err.statusCode = 400;
            throw err;
        }

        const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, itemType: 'SALE' } });
        if (!item) {
            const err = new Error('Item not found.');
            err.statusCode = 404;
            throw err;
        }
        if (Array.isArray(expectedStatus) ? !expectedStatus.includes(item.status) : item.status !== expectedStatus) {
            const err = new Error(`Only items with status [${Array.isArray(expectedStatus) ? expectedStatus.join(', ') : expectedStatus}] can perform this action.`);
            err.statusCode = 400;
            throw err;
        }

        const [updatedItem] = await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: itemId },
                data: { status: newStatus },
            }),
            createEventLog(
                prisma,
                itemId,
                actorId,
                eventType,
                { details: details || `Status changed from ${item.status} to ${newStatus}.` }
            )
        ]);

        res.status(200).json(updatedItem);
    } catch (error) {
        next(error);
    }
};

inventoryController.decommissionItem = (req, res, next) => {
    updateItemStatus(res, req, next, ['IN_STOCK', 'DEFECTIVE'], 'DECOMMISSIONED', EventType.DECOMMISSION, 'Item decommissioned.');
};

inventoryController.reinstateItem = (req, res, next) => {
    updateItemStatus(res, req, next, 'DECOMMISSIONED', 'IN_STOCK', EventType.REINSTATE, 'Item reinstated to stock.');
};

inventoryController.markAsReserved = (req, res, next) => {
    updateItemStatus(res, req, next, 'IN_STOCK', 'RESERVED', EventType.UPDATE, 'Item marked as reserved.');
};

inventoryController.unreserveItem = (req, res, next) => {
    updateItemStatus(res, req, next, 'RESERVED', 'IN_STOCK', EventType.UPDATE, 'Item unreserved and returned to stock.');
};

inventoryController.markAsDefective = (req, res, next) => {
    updateItemStatus(res, req, next, ['IN_STOCK', 'RESERVED'], 'DEFECTIVE', EventType.UPDATE, 'Item marked as defective.');
};

inventoryController.markAsInStock = (req, res, next) => {
    updateItemStatus(res, req, next, 'DEFECTIVE', 'IN_STOCK', EventType.UPDATE, 'Item returned to stock from defective status.');
};

module.exports = inventoryController;