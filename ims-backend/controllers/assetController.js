// ims-backend/controllers/assetController.js

const { PrismaClient, ItemType } = require('@prisma/client');
const prisma = new PrismaClient();
const assetController = {};

// POST /api/assets - สร้าง Asset ใหม่
assetController.createAsset = async (req, res) => {
    try {
        const { serialNumber, macAddress, productModelId, assetCode } = req.body;
        const userId = req.user.id;

        const newAsset = await prisma.inventoryItem.create({
            data: {
                itemType: ItemType.ASSET, // บังคับเป็น ASSET
                assetCode: assetCode,
                serialNumber: serialNumber || null,
                macAddress: macAddress || null,
                productModelId,
                addedById: userId,
                status: 'IN_WAREHOUSE',
            },
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

// PUT /api/assets/:id - อัปเดตข้อมูล Asset
assetController.updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { assetCode, serialNumber, macAddress, status, productModelId } = req.body;
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
        res.status(200).json(updatedAsset);
    } catch (error) {
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target;
            return res.status(400).json({ error: `The following fields must be unique: ${target}` });
        }
        res.status(500).json({ error: 'Could not update the asset' });
    }
};

// DELETE /api/assets/:id - ลบ Asset
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
        console.error("Delete Asset Error:", error);
        res.status(500).json({ error: 'Could not delete the asset.' });
    }
};


// --- โค้ดเดิมจากขั้นตอนที่ 1 ---
assetController.getAllAssets = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All';

        let where = { itemType: ItemType.ASSET };

        if (searchTerm) {
            where.OR = [
                { serialNumber: { contains: searchTerm } },
                { macAddress: { equals: searchTerm } },
                { productModel: { modelNumber: { contains: searchTerm } } },
                { assetCode: { contains: searchTerm } },
                { assignmentRecords: { some: { assignment: { assignee: { name: { contains: searchTerm } } } } } }
            ];
        }
        
        if (statusFilter && statusFilter !== 'All') {
            where.status = statusFilter;
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

assetController.getAssetHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const assignmentRecords = await prisma.assetAssignmentOnItems.findMany({
            where: { inventoryItemId: parseInt(id) },
            include: {
                assignment: {
                    include: {
                        assignee: { select: { name: true } },
                    }
                }
            },
            orderBy: {
                assignedAt: 'desc'
            }
        });

        const formattedHistory = assignmentRecords.map(record => ({
            id: `${record.assignmentId}-${record.inventoryItemId}`,
            assignedTo: record.assignment.assignee,
            assignedAt: record.assignedAt,
            returnedAt: record.returnedAt,
            notes: record.assignment.notes
        }));

        res.status(200).json(formattedHistory);
    } catch (error) {
        console.error("Error fetching asset history:", error);
        res.status(500).json({ error: 'Could not fetch asset history.' });
    }
};

assetController.decommissionAsset = async (req, res) => {
    const { id } = req.params;
    try {
        const asset = await prisma.inventoryItem.findFirst({ where: { id: parseInt(id), itemType: 'ASSET' } });

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found.' });
        }
        if (asset.status !== 'IN_WAREHOUSE') {
            return res.status(400).json({ error: 'Only assets in the warehouse can be decommissioned.' });
        }

        const decommissionedAsset = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: { status: 'DECOMMISSIONED' },
        });
        res.status(200).json(decommissionedAsset);
    } catch (error) {
        res.status(500).json({ error: 'Could not decommission the asset.' });
    }
};

assetController.reinstateAsset = async (req, res) => {
    const { id } = req.params;
    try {
        const asset = await prisma.inventoryItem.findFirst({ where: { id: parseInt(id), itemType: 'ASSET' } });

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found.' });
        }
        if (asset.status !== 'DECOMMISSIONED') {
            return res.status(400).json({ error: 'Only decommissioned assets can be reinstated.' });
        }

        const reinstatedAsset = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: { status: 'IN_WAREHOUSE' },
        });
        res.status(200).json(reinstatedAsset);
    } catch (error) {
        res.status(500).json({ error: 'Could not reinstate the asset.' });
    }
};

module.exports = assetController;