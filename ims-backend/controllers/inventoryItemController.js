// ims-backend/controllers/inventoryItemController.js

const { PrismaClient, ItemType } = require('@prisma/client');
const prisma = new PrismaClient();
const inventoryItemController = {};

// ... (ฟังก์ชัน addInventoryItem ไม่เปลี่ยนแปลง) ...
inventoryItemController.addInventoryItem = async (req, res) => {
    try {
        const { serialNumber, macAddress, productModelId, itemType, assetCode } = req.body;
        const userId = req.user.id;

        const newItem = await prisma.inventoryItem.create({
            data: {
                itemType: itemType || ItemType.SALE,
                assetCode: itemType === 'ASSET' ? assetCode : null,
                serialNumber: serialNumber || null,
                macAddress: macAddress || null,
                productModelId,
                addedById: userId,
                status: itemType === 'ASSET' ? 'IN_WAREHOUSE' : 'IN_STOCK',
            },
        });
        res.status(201).json(newItem);
    } catch (error) {
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta.target) 
                ? error.meta.target.join(', ') 
                : error.meta.target;
            return res.status(400).json({ error: `The following fields must be unique: ${target}` });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not add the item to inventory' });
    }
};


// --- START: แก้ไข getAllInventoryItems ---
inventoryItemController.getAllInventoryItems = async (req, res) => {
    try {
        if (req.query.all === 'true') {
            const allItems = await prisma.inventoryItem.findMany({
                 where: { status: 'IN_STOCK', itemType: ItemType.SALE },
                 include: {
                    productModel: {
                        include: { brand: true, category: true }
                    },
                 },
                 orderBy: { updatedAt: 'desc' }
            });
            return res.status(200).json(allItems);
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All';
        const itemTypeFilter = req.query.itemType;

        let where = {};
        
        if (itemTypeFilter) {
            where.itemType = itemTypeFilter;
        }

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

        const include = {
            productModel: { include: { category: true, brand: true } },
            addedBy: { select: { name: true } },
        };
        
        if (itemTypeFilter === 'ASSET') {
            include.assignmentRecords = {
                where: { returnedAt: null },
                include: { assignment: { include: { assignee: { select: { name: true } } } } }
            };
        } else {
             include.borrowingRecords = {
                where: { returnedAt: null },
                select: { borrowingId: true }
            };
        }

        const [items, totalItems] = await prisma.$transaction([
            prisma.inventoryItem.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include
            }),
            prisma.inventoryItem.count({ where })
        ]);

        const formattedItems = items.map(item => {
            if (item.itemType === 'ASSET') {
                const currentHolder = item.assignmentRecords[0]?.assignment.assignee.name || null;
                const { assignmentRecords, ...restOfItem } = item;
                return { ...restOfItem, assignedTo: { name: currentHolder } };
            } else {
                const activeBorrowing = item.borrowingRecords.length > 0 ? item.borrowingRecords[0] : null;
                const { borrowingRecords, ...restOfItem } = item;
                return { ...restOfItem, borrowingId: activeBorrowing ? activeBorrowing.borrowingId : null };
            }
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
        console.error("Error in getAllInventoryItems:", error); // Log the actual error
        res.status(500).json({ error: 'Could not fetch inventory items' });
    }
};
// --- END: แก้ไข getAllInventoryItems ---

// ... (ฟังก์ชัน getInventoryItemById, updateInventoryItem, deleteInventoryItem, getAssetHistory ไม่เปลี่ยนแปลง) ...
inventoryItemController.getInventoryItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await prisma.inventoryItem.findUnique({
            where: { id: parseInt(id) },
            include: { 
                productModel: {
                    include: {
                        category: true,
                        brand: true
                    }
                },
                addedBy: { select: { name: true } },
                assignmentRecords: {
                     where: { returnedAt: null },
                      include: {
                          assignment: {
                              include: {
                                  assignee: { select: { name: true } }
                              }
                          }
                      }
                }
            }
        });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        const currentHolder = item.assignmentRecords[0]?.assignment.assignee.name || null;
        const finalItem = { ...item, assignedTo: { name: currentHolder } };

        res.status(200).json(finalItem);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch the item' });
    }
};

inventoryItemController.updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { assetCode, serialNumber, macAddress, status, productModelId } = req.body; 
        const updatedItem = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: { 
                assetCode,
                serialNumber: serialNumber || null, 
                macAddress: macAddress || null, 
                status,
                productModelId
            },
        });
        res.status(200).json(updatedItem);
    } catch (error) {
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta.target) 
                ? error.meta.target.join(', ') 
                : error.meta.target;
            return res.status(400).json({ error: `The following fields must be unique: ${target}` });
        }
        res.status(500).json({ error: 'Could not update the item' });
    }
};

inventoryItemController.deleteInventoryItem = async (req, res) => {
    const { id } = req.params;
    try {
        const itemToDelete = await prisma.inventoryItem.findUnique({
            where: { id: parseInt(id) },
            include: {
                borrowingRecords: {
                    where: { returnedAt: null }
                },
                assignmentRecords: {
                    where: { returnedAt: null }
                }
            }
        });

        if (!itemToDelete) {
            return res.status(404).json({ error: 'Item not found.' });
        }
        
        if (itemToDelete.status === 'SOLD' || itemToDelete.borrowingRecords.length > 0 || itemToDelete.assignmentRecords.length > 0) {
            let reason = 'in use';
            if (itemToDelete.status === 'SOLD') reason = 'SOLD';
            if (itemToDelete.borrowingRecords.length > 0) reason = 'actively BORROWED';
            if (itemToDelete.assignmentRecords.length > 0) reason = 'actively ASSIGNED';
            return res.status(400).json({ error: `Cannot delete item. It is currently ${reason}.` });
        }
        
        await prisma.$transaction(async (tx) => {
            await tx.borrowingOnItems.deleteMany({
                where: { inventoryItemId: parseInt(id) }
            });
             await tx.assetAssignmentOnItems.deleteMany({
                where: { inventoryItemId: parseInt(id) }
            });
             await tx.assetHistory.deleteMany({
                where: { inventoryItemId: parseInt(id) }
            });
            await tx.inventoryItem.delete({
                where: { id: parseInt(id) },
            });
        });

        res.status(204).send();
    } catch (error) {
        console.error("Delete Item Error:", error);
        res.status(500).json({ error: 'Could not delete the item.' });
    }
};

inventoryItemController.getAssetHistory = async (req, res) => {
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

// --- START: รวมฟังก์ชัน Decommission และ Reinstate ---
inventoryItemController.decommission = async (req, res) => {
    const { id } = req.params;
    try {
        const item = await prisma.inventoryItem.findUnique({ where: { id: parseInt(id) } });
        if (!item) return res.status(404).json({ error: 'Item not found.' });

        const allowedStatuses = item.itemType === 'ASSET'
            ? ['IN_WAREHOUSE']
            : ['IN_STOCK', 'DEFECTIVE'];

        if (!allowedStatuses.includes(item.status)) {
            return res.status(400).json({ error: `Only items with status [${allowedStatuses.join(', ')}] can be decommissioned.` });
        }

        const updatedItem = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: { status: 'DECOMMISSIONED' },
        });
        res.status(200).json(updatedItem);
    } catch (error) {
        res.status(500).json({ error: 'Could not decommission the item.' });
    }
};

inventoryItemController.reinstate = async (req, res) => {
    const { id } = req.params;
    try {
        const item = await prisma.inventoryItem.findUnique({ where: { id: parseInt(id) } });
        if (!item) return res.status(404).json({ error: 'Item not found.' });

        if (item.status !== 'DECOMMISSIONED') {
            return res.status(400).json({ error: 'Only decommissioned items can be reinstated.' });
        }
        
        const newStatus = item.itemType === 'ASSET' ? 'IN_WAREHOUSE' : 'IN_STOCK';

        const updatedItem = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: { status: newStatus },
        });
        res.status(200).json(updatedItem);
    } catch (error) {
        res.status(500).json({ error: 'Could not reinstate the item.' });
    }
};

inventoryController.getInventoryItemHistory = async (req, res) => {
    const { id } = req.params;
    const itemId = parseInt(id);

    try {
        const item = await prisma.inventoryItem.findUnique({
            where: { id: itemId },
            include: { productModel: true }
        });

        if (!item || item.itemType !== 'SALE') {
            return res.status(404).json({ error: 'Inventory item for sale not found.' });
        }

        const history = [];

        // 1. ตรวจสอบประวัติการขาย
        const saleRecord = await prisma.sale.findFirst({
            where: { itemsSold: { some: { id: itemId } } },
            include: { customer: true, soldBy: true }
        });
        if (saleRecord) {
            history.push({
                type: 'SALE',
                status: saleRecord.status,
                date: saleRecord.saleDate,
                customer: saleRecord.customer.name,
                user: saleRecord.soldBy.name,
                transactionId: saleRecord.id
            });
        }

        // 2. ตรวจสอบประวัติการยืม-คืน
        const borrowingRecords = await prisma.borrowingOnItems.findMany({
            where: { inventoryItemId: itemId },
            include: {
                borrowing: {
                    include: {
                        borrower: true, // Customer
                        approvedBy: true // User
                    }
                }
            },
            orderBy: { assignedAt: 'asc' }
        });

        borrowingRecords.forEach(record => {
            // Event: Borrowed
            history.push({
                type: 'BORROW',
                date: record.assignedAt,
                customer: record.borrowing.borrower.name,
                user: record.borrowing.approvedBy.name,
                transactionId: record.borrowingId
            });
            // Event: Returned
            if (record.returnedAt) {
                history.push({
                    type: 'RETURN',
                    date: record.returnedAt,
                    customer: record.borrowing.borrower.name,
                    user: record.borrowing.approvedBy.name, // อาจจะต้องเพิ่ม User ที่รับคืนในอนาคต
                    transactionId: record.borrowingId
                });
            }
        });
        
        // 3. เรียงลำดับประวัติทั้งหมดตามวันที่ล่าสุดก่อน
        const sortedHistory = history.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({
            itemDetails: item,
            history: sortedHistory
        });

    } catch (error) {
        console.error("Error fetching item history:", error);
        res.status(500).json({ error: 'Could not fetch item history.' });
    }
};
// --- END: รวมฟังก์ชัน ---

module.exports = inventoryItemController;