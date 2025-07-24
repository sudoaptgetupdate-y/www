// ims-backend/controllers/assetController.js

const { PrismaClient, ItemType, EventType } = require('@prisma/client');
const prisma = new PrismaClient();
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
        const { serialNumber, macAddress, productModelId, assetCode } = req.body;
        const userId = req.user.id;

        if (typeof assetCode !== 'string' || assetCode.trim() === '') {
            const err = new Error('Asset Code is required and must be a string.');
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

        const newAsset = await prisma.$transaction(async (tx) => {
            const createdAsset = await tx.inventoryItem.create({
                data: {
                    itemType: ItemType.ASSET,
                    assetCode: assetCode,
                    serialNumber: serialNumber || null,
                    macAddress: macAddress || null,
                    productModelId,
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

assetController.updateAsset = async (req, res, next) => {
    const { id } = req.params;
    const actorId = req.user.id;
    try {
        const { assetCode, serialNumber, macAddress, status, productModelId } = req.body;

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
                    productModelId
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
                repairRecords: true // <-- เพิ่มการ include repairRecords
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
        // --- START: เพิ่มเงื่อนไขการตรวจสอบ ---
        if (assetToDelete.repairRecords.length > 0) {
            const err = new Error('Cannot delete asset. It has repair history and cannot be deleted.');
            err.statusCode = 400;
            throw err;
        }
        // --- END ---

        await prisma.$transaction(async (tx) => {
            // ลบ event logs และ assignment records ก่อน
            await tx.eventLog.deleteMany({ where: { inventoryItemId: assetId } });
            await tx.assetAssignmentOnItems.deleteMany({ where: { inventoryItemId: assetId } });
            // จากนั้นจึงลบตัว asset หลัก
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
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        const include = {
            productModel: { include: { category: true, brand: true } },
            addedBy: { select: { name: true } },
            assignmentRecords: {
                where: { returnedAt: null },
                include: { assignment: { include: { assignee: { select: { name: true } } } } }
            },
            repairRecords: {
                where: { returnedAt: null },
                select: { repairId: true }
            }
        };

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
            throw err;
        }

        const item = await prisma.inventoryItem.findFirst({
            where: { id: assetId, itemType: ItemType.ASSET },
            include: { 
                productModel: { include: { category: true, brand: true } },
                addedBy: { select: { name: true } },
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
            throw err;
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
            throw err;
        }

        const asset = await prisma.inventoryItem.findFirst({ where: { id: assetId, itemType: 'ASSET' } });

        if (!asset) {
            const err = new Error('Asset not found.');
            err.statusCode = 404;
            throw err;
        }
        
        if (!['IN_WAREHOUSE', 'DEFECTIVE'].includes(asset.status)) {
            const err = new Error('Only assets in the warehouse or marked as defective can be decommissioned.');
            err.statusCode = 400;
            throw err;
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
            throw err;
        }

        const asset = await prisma.inventoryItem.findFirst({ where: { id: assetId, itemType: 'ASSET' } });

        if (!asset) {
            const err = new Error('Asset not found.');
            err.statusCode = 404;
            throw err;
        }
        if (asset.status !== 'DECOMMISSIONED') {
            const err = new Error('Only decommissioned assets can be reinstated.');
            err.statusCode = 400;
            throw err;
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