// ims-backend/controllers/assetController.js
const prisma = require('../prisma/client');
const { ItemType, EventType } = require('@prisma/client');
const assetController = {};

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

assetController.createAsset = async (req, res, next) => {
    try {
        const { serialNumber, macAddress, productModelId, assetCode, supplierId } = req.body;
        const userId = req.user.id;

        if (typeof assetCode !== 'string' || assetCode.trim() === '') {
            const err = new Error('Asset Code is required and must be a string.');
            err.statusCode = 400;
            return next(err);
        }
        
        const parsedModelId = parseInt(productModelId, 10);
        if (isNaN(parsedModelId)) {
            const err = new Error('Product Model ID is required and must be a valid number.');
            err.statusCode = 400;
            return next(err);
        }

        const productModel = await prisma.productModel.findUnique({
            where: { id: parsedModelId },
            include: { category: true },
        });

        if (!productModel) {
            const err = new Error('Product Model not found.');
            err.statusCode = 404;
            return next(err);
        }

        const { category } = productModel;
        if (category.requiresSerialNumber && (!serialNumber || serialNumber.trim() === '')) {
            const err = new Error('Serial Number is required for this category.');
            err.statusCode = 400;
            return next(err);
        }
        if (category.requiresMacAddress && (!macAddress || macAddress.trim() === '')) {
            const err = new Error('MAC Address is required for this category.');
            err.statusCode = 400;
            return next(err);
        }

        if (macAddress && (typeof macAddress !== 'string' || !macRegex.test(macAddress))) {
            const err = new Error('Invalid MAC Address format.');
            err.statusCode = 400;
            return next(err);
        }

        const newAsset = await prisma.$transaction(async (tx) => {
            const createdAsset = await tx.inventoryItem.create({
                data: {
                    itemType: ItemType.ASSET,
                    assetCode: assetCode,
                    serialNumber: serialNumber || null,
                    macAddress: macAddress || null,
                    productModelId: parsedModelId,
                    supplierId: supplierId ? parseInt(supplierId) : null,
                    addedById: userId,
                    status: 'IN_WAREHOUSE',
                },
            });
            
            await createEventLog(
                tx,
                createdAsset.id,
                userId,
                EventType.CREATE,
                { details: `Asset created with code ${assetCode}.` }
            );

            return createdAsset;
        });

        res.status(201).json(newAsset);
    } catch (error) {
        next(error);
    }
};

assetController.addBatchAssets = async (req, res, next) => {
    try {
        const { productModelId, supplierId, items } = req.body;
        const userId = req.user.id;
        
        const parsedModelId = parseInt(productModelId, 10);
        if (isNaN(parsedModelId)) {
            const err = new Error('Product Model ID is required and must be a valid number.');
            err.statusCode = 400;
            return next(err);
        }

        if (!Array.isArray(items) || items.length === 0) {
            const err = new Error('Items list cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }
        
        const productModel = await prisma.productModel.findUnique({
            where: { id: parsedModelId },
            include: { category: true },
        });
        if (!productModel) {
            const err = new Error('Product Model not found.');
            err.statusCode = 404;
            return next(err);
        }
        const { category } = productModel;

        const newAssets = await prisma.$transaction(async (tx) => {
            const createdAssets = [];
            for (const item of items) {
                if (!item.assetCode || typeof item.assetCode !== 'string' || item.assetCode.trim() === '') {
                    throw new Error('Asset Code is required for all items in the list.');
                }
                if (category.requiresSerialNumber && (!item.serialNumber || item.serialNumber.trim() === '')) {
                    throw new Error(`Serial Number is required for Asset Code ${item.assetCode}.`);
                }
                if (category.requiresMacAddress && (!item.macAddress || item.macAddress.trim() === '')) {
                    throw new Error(`MAC Address is required for Asset Code ${item.assetCode}.`);
                }
                if (item.macAddress && (typeof item.macAddress !== 'string' || !macRegex.test(item.macAddress))) {
                    throw new Error(`Invalid MAC Address format for Asset Code ${item.assetCode}.`);
                }

                const createdAsset = await tx.inventoryItem.create({
                    data: {
                        itemType: ItemType.ASSET,
                        status: 'IN_WAREHOUSE',
                        assetCode: item.assetCode,
                        serialNumber: item.serialNumber || null,
                        macAddress: item.macAddress || null,
                        productModelId: parsedModelId,
                        supplierId: supplierId ? parseInt(supplierId) : null,
                        addedById: userId,
                    },
                });

                await createEventLog(
                    tx,
                    createdAsset.id,
                    userId,
                    EventType.CREATE,
                    { details: `Asset created in batch with code: ${createdAsset.assetCode}.` }
                );
                
                createdAssets.push(createdAsset);
            }
            return createdAssets;
        });

        res.status(201).json({
            message: `${newAssets.length} assets have been added successfully.`,
            data: newAssets,
        });

    } catch (error) {
        next(error);
    }
};

assetController.updateAsset = async (req, res, next) => {
    const { id } = req.params;
    const actorId = req.user.id;
    try {
        const { assetCode, serialNumber, macAddress, status, productModelId, supplierId } = req.body;

        const assetId = parseInt(id);
        if (isNaN(assetId)) {
            const err = new Error('Invalid Asset ID.');
            err.statusCode = 400;
            return next(err);
        }
        if (typeof assetCode !== 'string' || assetCode.trim() === '') {
            const err = new Error('Asset Code is required and must be a string.');
            err.statusCode = 400;
            return next(err);
        }
        
        const parsedModelId = parseInt(productModelId, 10);
        if (isNaN(parsedModelId)) {
            const err = new Error('Product Model ID is required and must be a valid number.');
            err.statusCode = 400;
            return next(err);
        }

        const productModel = await prisma.productModel.findUnique({
            where: { id: parsedModelId },
            include: { category: true },
        });
        if (!productModel) {
            const err = new Error('Product Model not found.');
            err.statusCode = 404;
            return next(err);
        }
        const { category } = productModel;
        if (category.requiresSerialNumber && (!serialNumber || serialNumber.trim() === '')) {
            const err = new Error('Serial Number is required for this category.');
            err.statusCode = 400;
            return next(err);
        }
        if (category.requiresMacAddress && (!macAddress || macAddress.trim() === '')) {
            const err = new Error('MAC Address is required for this category.');
            err.statusCode = 400;
            return next(err);
        }

        if (macAddress && (typeof macAddress !== 'string' || !macRegex.test(macAddress))) {
            const err = new Error('Invalid MAC Address format.');
            err.statusCode = 400;
            return next(err);
        }
        
        const originalAsset = await prisma.inventoryItem.findUnique({ where: { id: assetId } });
        if (!originalAsset) {
            const err = new Error('The asset you are trying to update was not found.');
            err.statusCode = 404;
            throw err;
        }

        const updatedAsset = await prisma.$transaction(async (tx) => {
            const updated = await tx.inventoryItem.update({
                where: { id: assetId, itemType: 'ASSET' },
                data: {
                    assetCode,
                    serialNumber: serialNumber || null,
                    macAddress: macAddress || null,
                    status,
                    productModelId: parsedModelId,
                    supplierId: supplierId ? parseInt(supplierId, 10) : null,
                },
            });

            await createEventLog(
                tx,
                assetId,
                actorId,
                EventType.UPDATE,
                { details: `Asset details updated.` }
            );
            
            return updated;
        });

        res.status(200).json(updatedAsset);
    } catch (error) {
        next(error);
    }
};

assetController.deleteAsset = async (req, res, next) => {
    const { id } = req.params;
    try {
        const assetId = parseInt(id);
        if (isNaN(assetId)) {
            const err = new Error('Invalid Asset ID.');
            err.statusCode = 400;
            throw err;
        }

        const assetToDelete = await prisma.inventoryItem.findFirst({
            where: { id: assetId, itemType: 'ASSET' },
            include: { 
                assignmentRecords: { where: { returnedAt: null } },
                repairRecords: true
            }
        });

        if (!assetToDelete) {
            const err = new Error('Asset not found.');
            err.statusCode = 404;
            throw err;
        }
        if (assetToDelete.assignmentRecords.length > 0) {
            const err = new Error('Cannot delete asset. It is currently ASSIGNED.');
            err.statusCode = 400;
            throw err;
        }
        
        if (assetToDelete.repairRecords.length > 0) {
            const err = new Error('Cannot delete asset. It has repair history and cannot be deleted.');
            err.statusCode = 400;
            throw err;
        }

        await prisma.$transaction(async (tx) => {
            await tx.eventLog.deleteMany({ where: { inventoryItemId: assetId } });
            await tx.assetAssignmentOnItems.deleteMany({ where: { inventoryItemId: assetId } });
            await tx.inventoryItem.delete({ where: { id: assetId } });
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

assetController.getAllAssets = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All';
        const categoryIdFilter = req.query.categoryId || 'All';
        const brandIdFilter = req.query.brandId || 'All';
        const sortBy = req.query.sortBy || 'updatedAt';
        const sortOrder = req.query.sortOrder || 'desc';

        let where = { itemType: ItemType.ASSET };

        if (searchTerm) {
            where.OR = [
                { serialNumber: { contains: searchTerm } },
                { macAddress: { equals: searchTerm } },
                { productModel: { modelNumber: { contains: searchTerm } } },
                { assetCode: { contains: searchTerm } },
            ];
        }
        
        if (statusFilter && statusFilter !== 'All') {
            where.status = statusFilter;
        }

        if (categoryIdFilter && categoryIdFilter !== 'All') {
            where.productModel = { ...where.productModel, categoryId: parseInt(categoryIdFilter) };
        }
        if (brandIdFilter && brandIdFilter !== 'All') {
            where.productModel = { ...where.productModel, brandId: parseInt(brandIdFilter) };
        }

        let orderBy = {};
        if (sortBy === 'productModel') {
            orderBy = { productModel: { modelNumber: sortOrder } };
        } else if (sortBy === 'category') {
            orderBy = { productModel: { category: { name: sortOrder } } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        // --- START: ADDED `supplier: true` ---
        const include = {
            productModel: { include: { category: true, brand: true } },
            addedBy: { select: { name: true } },
            supplier: true,
            assignmentRecords: {
                where: { returnedAt: null },
                include: { assignment: { include: { assignee: { select: { name: true } } } } }
            },
            repairRecords: {
                where: { returnedAt: null },
                select: { repairId: true }
            }
        };
        // --- END: ADDED `supplier: true` ---

        const [items, totalItems] = await Promise.all([
            prisma.inventoryItem.findMany({ where, skip, take: limit, orderBy, include }),
            prisma.inventoryItem.count({ where })
        ]);

        const formattedItems = items.map(item => {
            const currentAssignmentRecord = item.assignmentRecords[0] || null;
            const currentHolder = currentAssignmentRecord?.assignment.assignee.name || null;
            const assignmentId = currentAssignmentRecord?.assignment.id || null;
            const activeRepair = item.repairRecords.length > 0 ? item.repairRecords[0] : null;
            const { assignmentRecords, repairRecords, ...restOfItem } = item;
            return { 
                ...restOfItem, 
                assignedTo: { name: currentHolder },
                assignmentId: assignmentId,
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

assetController.getAssetById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const assetId = parseInt(id);
        if (isNaN(assetId)) {
            const err = new Error('Invalid Asset ID.');
            err.statusCode = 400;
            return next(err);
        }

        const item = await prisma.inventoryItem.findFirst({
            where: { id: assetId, itemType: ItemType.ASSET },
            include: { 
                productModel: { include: { category: true, brand: true } },
                addedBy: { select: { name: true } },
                supplier: true, // <-- Also add here for consistency
                assignmentRecords: {
                     where: { returnedAt: null },
                      include: {
                          assignment: {
                              include: { assignee: { select: { name: true } } }
                          }
                      }
                }
            }
        });
        if (!item) {
            const err = new Error('Asset not found');
            err.statusCode = 404;
            return next(err);
        }
        
        const currentHolder = item.assignmentRecords[0]?.assignment.assignee.name || null;
        const finalItem = { ...item, assignedTo: { name: currentHolder } };

        res.status(200).json(finalItem);
    } catch (error) {
        next(error);
    }
};

assetController.decommissionAsset = async (req, res, next) => {
    const { id } = req.params;
    const actorId = req.user.id;

    try {
        const assetId = parseInt(id);
        if (isNaN(assetId)) {
            const err = new Error('Invalid Asset ID.');
            err.statusCode = 400;
            return next(err);
        }

        const asset = await prisma.inventoryItem.findFirst({ where: { id: assetId, itemType: 'ASSET' } });

        if (!asset) {
            const err = new Error('Asset not found.');
            err.statusCode = 404;
            return next(err);
        }
        
        if (!['IN_WAREHOUSE', 'DEFECTIVE'].includes(asset.status)) {
            const err = new Error('Only assets in the warehouse or marked as defective can be decommissioned.');
            err.statusCode = 400;
            return next(err);
        }

        await prisma.$transaction(async (tx) => {
            await tx.inventoryItem.update({
                where: { id: assetId },
                data: { status: 'DECOMMISSIONED' },
            });
            await createEventLog(
                tx,
                assetId,
                actorId,
                EventType.DECOMMISSION,
                { details: `Asset status changed from ${asset.status} to DECOMMISSIONED.` }
            );
        });
        
        res.status(200).json({ message: 'Asset decommissioned successfully.' });
    } catch (error) {
        next(error);
    }
};

assetController.reinstateAsset = async (req, res, next) => {
    const { id } = req.params;
    const actorId = req.user.id;

    try {
        const assetId = parseInt(id);
        if (isNaN(assetId)) {
            const err = new Error('Invalid Asset ID.');
            err.statusCode = 400;
            return next(err);
        }

        const asset = await prisma.inventoryItem.findFirst({ where: { id: assetId, itemType: 'ASSET' } });

        if (!asset) {
            const err = new Error('Asset not found.');
            err.statusCode = 404;
            return next(err);
        }
        if (asset.status !== 'DECOMMISSIONED') {
            const err = new Error('Only decommissioned assets can be reinstated.');
            err.statusCode = 400;
            return next(err);
        }

        await prisma.$transaction(async (tx) => {
            await tx.inventoryItem.update({
                where: { id: assetId },
                data: { status: 'IN_WAREHOUSE' },
            });
            await createEventLog(
                tx,
                assetId,
                actorId,
                EventType.REINSTATE,
                { details: 'Asset was reinstated to warehouse.' }
            );
        });
        
        res.status(200).json({ message: 'Asset reinstated successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = assetController;