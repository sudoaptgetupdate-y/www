// ims-backend/controllers/inventoryController.js

const { PrismaClient, ItemType } = require('@prisma/client');
const prisma = new PrismaClient();
const inventoryController = {};

inventoryController.addInventoryItem = async (req, res) => {
    try {
        const { serialNumber, macAddress, productModelId } = req.body;
        const userId = req.user.id;

        const newItem = await prisma.inventoryItem.create({
            data: {
                itemType: ItemType.SALE,
                serialNumber: serialNumber || null,
                macAddress: macAddress || null,
                productModelId,
                addedById: userId,
                status: 'IN_STOCK',
            },
        });
        res.status(201).json(newItem);
    } catch (error) {
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target;
            return res.status(400).json({ error: `The following fields must be unique: ${target}` });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not add the item to inventory' });
    }
};

inventoryController.getAllInventoryItems = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All';

        let where = { itemType: ItemType.SALE }; // Default to SALE items

        if (searchTerm) {
            where.OR = [
                { serialNumber: { contains: searchTerm } },
                { macAddress: { equals: searchTerm } },
                { productModel: { modelNumber: { contains: searchTerm } } },
            ];
        }
        if (statusFilter && statusFilter !== 'All') {
            where.status = statusFilter;
        }

        const include = {
            productModel: { include: { category: true, brand: true } },
            addedBy: { select: { name: true } },
            borrowingRecords: {
                where: { returnedAt: null },
                select: { borrowingId: true }
            }
        };

        const [items, totalItems] = await prisma.$transaction([
            prisma.inventoryItem.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include }),
            prisma.inventoryItem.count({ where })
        ]);

        const formattedItems = items.map(item => {
            const activeBorrowing = item.borrowingRecords.length > 0 ? item.borrowingRecords[0] : null;
            const { borrowingRecords, ...restOfItem } = item;
            return { ...restOfItem, borrowingId: activeBorrowing ? activeBorrowing.borrowingId : null };
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
        console.error("Error fetching inventory items:", error);
        res.status(500).json({ error: 'Could not fetch inventory items' });
    }
};

inventoryController.getInventoryItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await prisma.inventoryItem.findFirst({
            where: { id: parseInt(id), itemType: ItemType.SALE },
            include: { 
                productModel: { include: { category: true, brand: true } },
                addedBy: { select: { name: true } }
            }
        });
        if (!item) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch the item' });
    }
};

inventoryController.updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { serialNumber, macAddress, status, productModelId } = req.body;
        const updatedItem = await prisma.inventoryItem.update({
            where: { id: parseInt(id), itemType: 'SALE' },
            data: {
                serialNumber: serialNumber || null,
                macAddress: macAddress || null,
                status,
                productModelId
            },
        });
        res.status(200).json(updatedItem);
    } catch (error) {
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target;
            return res.status(400).json({ error: `The following fields must be unique: ${target}` });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'The item you are trying to update was not found.' });
        }
        res.status(500).json({ error: 'Could not update the item' });
    }
};

inventoryController.deleteInventoryItem = async (req, res) => {
    const { id } = req.params;
    try {
        const itemToDelete = await prisma.inventoryItem.findFirst({
            where: { id: parseInt(id), itemType: 'SALE' },
            include: { borrowingRecords: { where: { returnedAt: null } } }
        });

        if (!itemToDelete) {
            return res.status(404).json({ error: 'Item not found.' });
        }
        if (itemToDelete.status === 'SOLD' || itemToDelete.borrowingRecords.length > 0) {
            let reason = itemToDelete.status === 'SOLD' ? 'SOLD' : 'actively BORROWED';
            return res.status(400).json({ error: `Cannot delete item. It is currently ${reason}.` });
        }

        await prisma.$transaction(async (tx) => {
            await tx.borrowingOnItems.deleteMany({ where: { inventoryItemId: parseInt(id) } });
            await tx.inventoryItem.delete({ where: { id: parseInt(id) } });
        });

        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'The item you are trying to delete was not found.' });
        }
        console.error("Delete Item Error:", error);
        res.status(500).json({ error: 'Could not delete the item.' });
    }
};

inventoryController.decommissionItem = async (req, res) => {
    const { id } = req.params;
    try {
        const item = await prisma.inventoryItem.findFirst({ where: { id: parseInt(id), itemType: 'SALE' } });
        if (!item) return res.status(404).json({ error: 'Item not found.' });

        if (!['IN_STOCK', 'DEFECTIVE'].includes(item.status)) {
            return res.status(400).json({ error: 'Only items that are IN_STOCK or DEFECTIVE can be decommissioned.' });
        }

        const decommissionedItem = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: { status: 'DECOMMISSIONED' },
        });
        res.status(200).json(decommissionedItem);
    } catch (error) {
        res.status(500).json({ error: 'Could not decommission the item.' });
    }
};

inventoryController.reinstateItem = async (req, res) => {
    const { id } = req.params;
    try {
        const item = await prisma.inventoryItem.findFirst({ where: { id: parseInt(id), itemType: 'SALE' } });
        if (!item) return res.status(404).json({ error: 'Item not found.' });

        if (item.status !== 'DECOMMISSIONED') {
            return res.status(400).json({ error: 'Only decommissioned items can be reinstated.' });
        }

        const reinstatedItem = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data: { status: 'IN_STOCK' },
        });
        res.status(200).json(reinstatedItem);
    } catch (error) {
        res.status(500).json({ error: 'Could not reinstate the item.' });
    }
};

// --- START: ส่วนที่แก้ไข ---
inventoryController.getInventoryItemHistory = async (req, res) => {
    const { id } = req.params;
    const itemId = parseInt(id);

    try {
        const item = await prisma.inventoryItem.findUnique({
            where: { id: itemId },
            include: { productModel: true }
        });

        if (!item) { // No need to check itemType here, history is for all types
            return res.status(404).json({ error: 'Item not found.' });
        }

        const history = [];

        // 1. Sale History
        const saleRecord = await prisma.sale.findFirst({
            where: { itemsSold: { some: { id: itemId } } },
            include: { customer: true, soldBy: true, voidedBy: true }
        });
        if (saleRecord) {
            history.push({
                type: 'SALE',
                date: saleRecord.saleDate,
                details: `Sold to ${saleRecord.customer.name}`,
                user: saleRecord.soldBy.name,
                transactionId: saleRecord.id,
                transactionType: 'SALE'
            });
            if (saleRecord.status === 'VOIDED' && saleRecord.voidedAt) {
                history.push({
                    type: 'VOID',
                    date: saleRecord.voidedAt,
                    details: `Sale voided`,
                    user: saleRecord.voidedBy ? saleRecord.voidedBy.name : 'N/A',
                    transactionId: saleRecord.id,
                    transactionType: 'SALE'
                });
            }
        }

        // 2. Borrowing History
        const borrowingRecords = await prisma.borrowingOnItems.findMany({
            where: { inventoryItemId: itemId },
            include: { borrowing: { include: { borrower: true, approvedBy: true } } },
            orderBy: { assignedAt: 'asc' }
        });
        borrowingRecords.forEach(record => {
            history.push({
                type: 'BORROW',
                date: record.assignedAt,
                details: `Borrowed by ${record.borrowing.borrower.name}`,
                user: record.borrowing.approvedBy.name,
                transactionId: record.borrowingId,
                transactionType: 'BORROWING'
            });
            if (record.returnedAt) {
                history.push({
                    type: 'RETURN',
                    date: record.returnedAt,
                    details: `Returned by ${record.borrowing.borrower.name}`,
                    user: record.borrowing.approvedBy.name,
                    transactionId: record.borrowingId,
                    transactionType: 'BORROWING'
                });
            }
        });

        // 3. Repair History
        const repairRecords = await prisma.repairOnItems.findMany({
            where: { inventoryItemId: itemId },
            include: { repair: { include: { receiver: true, createdBy: true } } },
            orderBy: { sentAt: 'asc' }
        });
        repairRecords.forEach(record => {
            history.push({
                type: 'REPAIR_SENT',
                date: record.sentAt,
                details: `Sent to ${record.repair.receiver.name}`,
                user: record.repair.createdBy.name,
                transactionId: record.repairId,
                transactionType: 'REPAIR'
            });
            if (record.returnedAt) {
                const outcome = record.repairOutcome === 'REPAIRED_SUCCESSFULLY' ? 'Success' : 'Failed';
                history.push({
                    type: 'REPAIR_RETURNED',
                    date: record.returnedAt,
                    details: `Returned from ${record.repair.receiver.name} (Outcome: ${outcome})`,
                    user: record.repair.createdBy.name, // Assuming the creator is the one who receives it back
                    transactionId: record.repairId,
                    transactionType: 'REPAIR'
                });
            }
        });
        
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
// --- END: ส่วนที่แก้ไข ---

module.exports = inventoryController;