// ims-backend/controllers/assetController.js

const { PrismaClient, ItemType, HistoryEventType } = require('@prisma/client');
const prisma = new PrismaClient();
const assetController = {};

const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

assetController.createAsset = async (req, res, next) => {
    try {
        const { serialNumber, macAddress, productModelId, assetCode } = req.body;
        const userId = req.user.id;

        // --- START: Input Validation ---
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
        // --- END: Input Validation ---

        const newAsset = await prisma.inventoryItem.create({
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
        
        await prisma.assetHistory.create({
            data: {
                inventoryItemId: newAsset.id,
                userId: userId,
                type: HistoryEventType.CREATE,
                details: `Asset created with code ${assetCode}.`
            }
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

        // --- START: Input Validation ---
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
        // --- END: Input Validation ---
        
        const originalAsset = await prisma.inventoryItem.findUnique({ where: { id: assetId } });
        if (!originalAsset) {
            const err = new Error('The asset you are trying to update was not found.');
            err.statusCode = 404;
            throw err;
        }

        const updatedAsset = await prisma.inventoryItem.update({
            where: { id: assetId, itemType: 'ASSET' },
            data: {
                assetCode,
                serialNumber: serialNumber || null,
                macAddress: macAddress || null,
                status,
                productModelId
            },
        });
        
        const details = `Asset details updated.`;
        await prisma.assetHistory.create({
            data: {
                inventoryItemId: assetId,
                userId: actorId,
                type: HistoryEventType.UPDATE,
                details: details
            }
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
            include: { assignmentRecords: { where: { returnedAt: null } } }
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

        await prisma.$transaction(async (tx) => {
            await tx.assetAssignmentOnItems.deleteMany({ where: { inventoryItemId: assetId } });
            await tx.assetHistory.deleteMany({ where: { inventoryItemId: assetId } });
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

        const include = {
            productModel: { include: { category: true, brand: true } },
            addedBy: { select: { name: true } },
            assignmentRecords: {
                where: { returnedAt: null },
                include: { assignment: { include: { assignee: { select: { name: true } } } } }
            }
        };

        const [items, totalItems] = await prisma.$transaction([
            prisma.inventoryItem.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include }),
            prisma.inventoryItem.count({ where })
        ]);

        const formattedItems = items.map(item => {
            const currentHolder = item.assignmentRecords[0]?.assignment.assignee.name || null;
            const { assignmentRecords, ...restOfItem } = item;
            return { ...restOfItem, assignedTo: { name: currentHolder } };
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

        await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: assetId },
                data: { status: 'DECOMMISSIONED' },
            }),
            prisma.assetHistory.create({
                data: {
                    inventoryItemId: assetId,
                    userId: actorId,
                    type: HistoryEventType.DECOMMISSION,
                    details: `Asset status changed from ${asset.status} to DECOMMISSIONED.`
                }
            })
        ]);
        
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

        await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: assetId },
                data: { status: 'IN_WAREHOUSE' },
            }),
            prisma.assetHistory.create({
                data: {
                    inventoryItemId: assetId,
                    userId: actorId,
                    type: HistoryEventType.REINSTATE,
                    details: 'Asset was reinstated to warehouse.'
                }
            })
        ]);
        
        res.status(200).json({ message: 'Asset reinstated successfully.' });
    } catch (error) {
        next(error);
    }
};

assetController.getAssetHistory = async (req, res, next) => {
    const { id } = req.params;
    try {
        const assetId = parseInt(id);
        if (isNaN(assetId)) {
            const err = new Error('Invalid Asset ID.');
            err.statusCode = 400;
            throw err;
        }

        const history = await prisma.assetHistory.findMany({
            where: { inventoryItemId: assetId },
            include: {
                user: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(history);
    } catch (error) {
        next(error);
    }
};

module.exports = assetController;