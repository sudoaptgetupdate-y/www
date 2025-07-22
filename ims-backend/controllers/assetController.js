// ims-backend/controllers/assetController.js

const { PrismaClient, ItemType, HistoryEventType } = require('@prisma/client');
const prisma = new PrismaClient();
const assetController = {};

// ... (ฟังก์ชัน create, update, delete, getById, decommission, reinstate, getAssetHistory ไม่เปลี่ยนแปลง) ...
assetController.createAsset = async (req, res) => {
    try {
        const { serialNumber, macAddress, productModelId, assetCode } = req.body;
        const userId = req.user.id;

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
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target;
            return res.status(400).json({ error: `The following fields must be unique: ${target}` });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not create the asset' });
    }
};

assetController.updateAsset = async (req, res) => {
    const { id } = req.params;
    const actorId = req.user.id;
    try {
        const { assetCode, serialNumber, macAddress, status, productModelId } = req.body;
        
        const originalAsset = await prisma.inventoryItem.findUnique({ where: { id: parseInt(id) } });

        const updatedAsset = await prisma.inventoryItem.update({
            where: { id: parseInt(id), itemType: 'ASSET' },
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
                inventoryItemId: parseInt(id),
                userId: actorId,
                type: HistoryEventType.UPDATE,
                details: details
            }
        });

        res.status(200).json(updatedAsset);
    } catch (error) {
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target;
            return res.status(400).json({ error: `The following fields must be unique: ${target}` });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'The asset you are trying to update was not found.' });
        }
        res.status(500).json({ error: 'Could not update the asset' });
    }
};

assetController.deleteAsset = async (req, res) => {
    const { id } = req.params;
    try {
        const assetToDelete = await prisma.inventoryItem.findFirst({
            where: { id: parseInt(id), itemType: 'ASSET' },
            include: { assignmentRecords: { where: { returnedAt: null } } }
        });

        if (!assetToDelete) {
            return res.status(404).json({ error: 'Asset not found.' });
        }
        if (assetToDelete.assignmentRecords.length > 0) {
            return res.status(400).json({ error: 'Cannot delete asset. It is currently ASSIGNED.' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.assetAssignmentOnItems.deleteMany({ where: { inventoryItemId: parseInt(id) } });
            await tx.assetHistory.deleteMany({ where: { inventoryItemId: parseInt(id) } });
            await tx.inventoryItem.delete({ where: { id: parseInt(id) } });
        });

        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'The asset you are trying to delete was not found.' });
        }
        console.error("Delete Asset Error:", error);
        res.status(500).json({ error: 'Could not delete the asset.' });
    }
};

// --- START: แก้ไขฟังก์ชัน getAllAssets ---
assetController.getAllAssets = async (req, res) => {
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
        console.error("Error fetching assets:", error);
        res.status(500).json({ error: 'Could not fetch assets' });
    }
};
// --- END: แก้ไขฟังก์ชัน getAllAssets ---

assetController.getAssetById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await prisma.inventoryItem.findFirst({
            where: { id: parseInt(id), itemType: ItemType.ASSET },
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
            return res.status(404).json({ error: 'Asset not found' });
        }
        
        const currentHolder = item.assignmentRecords[0]?.assignment.assignee.name || null;
        const finalItem = { ...item, assignedTo: { name: currentHolder } };

        res.status(200).json(finalItem);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch the asset' });
    }
};

assetController.decommissionAsset = async (req, res) => {
    const { id } = req.params;
    const actorId = req.user.id;

    try {
        const asset = await prisma.inventoryItem.findFirst({ where: { id: parseInt(id), itemType: 'ASSET' } });

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found.' });
        }
        
        if (!['IN_WAREHOUSE', 'DEFECTIVE'].includes(asset.status)) {
            return res.status(400).json({ error: 'Only assets in the warehouse or marked as defective can be decommissioned.' });
        }

        await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: parseInt(id) },
                data: { status: 'DECOMMISSIONED' },
            }),
            prisma.assetHistory.create({
                data: {
                    inventoryItemId: parseInt(id),
                    userId: actorId,
                    type: HistoryEventType.DECOMMISSION,
                    details: `Asset status changed from ${asset.status} to DECOMMISSIONED.`
                }
            })
        ]);
        
        res.status(200).json({ message: 'Asset decommissioned successfully.' });
    } catch (error) {
        console.error("Decommission Error:", error);
        res.status(500).json({ error: 'Could not decommission the asset.' });
    }
};

assetController.reinstateAsset = async (req, res) => {
    const { id } = req.params;
    const actorId = req.user.id;

    try {
        const asset = await prisma.inventoryItem.findFirst({ where: { id: parseInt(id), itemType: 'ASSET' } });

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found.' });
        }
        if (asset.status !== 'DECOMMISSIONED') {
            return res.status(400).json({ error: 'Only decommissioned assets can be reinstated.' });
        }

        await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: parseInt(id) },
                data: { status: 'IN_WAREHOUSE' },
            }),
            prisma.assetHistory.create({
                data: {
                    inventoryItemId: parseInt(id),
                    userId: actorId,
                    type: HistoryEventType.REINSTATE,
                    details: 'Asset was reinstated to warehouse.'
                }
            })
        ]);
        
        res.status(200).json({ message: 'Asset reinstated successfully.' });
    } catch (error) {
        console.error("Reinstate Error:", error);
        res.status(500).json({ error: 'Could not reinstate the asset.' });
    }
};

assetController.getAssetHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const history = await prisma.assetHistory.findMany({
            where: { inventoryItemId: parseInt(id) },
            include: {
                user: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(history);
    } catch (error) {
        console.error("Error fetching asset history:", error);
        res.status(500).json({ error: 'Could not fetch asset history.' });
    }
};

module.exports = assetController;