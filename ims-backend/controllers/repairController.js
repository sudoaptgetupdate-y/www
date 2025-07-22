// ims-backend/controllers/repairController.js

const { PrismaClient, ItemStatus, ItemOwner, RepairStatus, RepairOutcome, ItemType, HistoryEventType } = require('@prisma/client');
const prisma = new PrismaClient();
const repairController = {};

repairController.createRepairOrder = async (req, res) => {
    const { senderId, receiverId, notes, items } = req.body;
    const createdById = req.user.id;

    if (!senderId || !receiverId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Sender, Receiver, and at least one item are required.' });
    }

    try {
        const newRepairOrder = await prisma.$transaction(async (tx) => {
            const itemsToCreate = items.filter(item => item.isCustomerItem);
            const createdCustomerItems = [];
            if (itemsToCreate.length > 0) {
                for (const item of itemsToCreate) {
                    const created = await tx.inventoryItem.create({
                        data: {
                            productModelId: item.productModelId,
                            serialNumber: item.serialNumber,
                            ownerType: ItemOwner.CUSTOMER,
                            status: ItemStatus.REPAIRING,
                            addedById: createdById,
                            itemType: ItemType.SALE 
                        },
                    });
                    createdCustomerItems.push(created);
                }
            }
            
            const companyItemIds = items.filter(item => !item.isCustomerItem).map(i => i.id);
            if (companyItemIds.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: companyItemIds } },
                    data: { status: ItemStatus.REPAIRING },
                });
            }

            const allItemIds = [...companyItemIds, ...createdCustomerItems.map(i => i.id)];

            const repairOrder = await tx.repair.create({
                data: {
                    senderId,
                    receiverId,
                    notes,
                    createdById,
                    items: {
                        create: allItemIds.map(id => ({
                            inventoryItemId: id
                        }))
                    }
                },
                include: { receiver: true }
            });

            const historyEvents = allItemIds.map(itemId => ({
                inventoryItemId: itemId,
                userId: createdById,
                type: HistoryEventType.REPAIR_SENT,
                details: `Sent to repair at ${repairOrder.receiver?.name || 'N/A'}.`
            }));
            await tx.assetHistory.createMany({ data: historyEvents });

            return repairOrder;
        });

        res.status(201).json(newRepairOrder);
    } catch (error) {
        console.error("Create Repair Error:", error);
        res.status(500).json({ error: 'Could not create repair order.' });
    }
};

repairController.getAllRepairOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [repairs, totalItems] = await Promise.all([
            prisma.repair.findMany({
                skip,
                take: limit,
                orderBy: { repairDate: 'desc' },
                include: {
                    sender: true,
                    receiver: true,
                    items: { select: { returnedAt: true } }
                }
            }),
            prisma.repair.count()
        ]);
        
        const formattedRepairs = repairs.map(r => {
            const totalItemCount = r.items.length;
            const returnedItemCount = r.items.filter(i => i.returnedAt !== null).length;
            const { items, ...rest } = r;
            return { ...rest, totalItemCount, returnedItemCount };
        });

        res.status(200).json({
            data: formattedRepairs,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch repair orders.' });
    }
};

repairController.getRepairOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const repairOrder = await prisma.repair.findUnique({
            where: { id: parseInt(id) },
            include: {
                sender: true,
                receiver: true,
                createdBy: { select: { name: true } },
                items: {
                    include: {
                        inventoryItem: { include: { productModel: true } }
                    },
                    orderBy: { sentAt: 'asc' }
                }
            }
        });

        if (!repairOrder) {
            return res.status(404).json({ error: 'Repair order not found.' });
        }

        res.status(200).json(repairOrder);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch the repair order.' });
    }
};

repairController.returnItemsFromRepair = async (req, res) => {
    const { id: repairId } = req.params;
    const { itemsToReturn } = req.body;
    const actorId = req.user.id;

    if (!itemsToReturn || itemsToReturn.length === 0) {
        return res.status(400).json({ error: 'At least one item to return is required.' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            const now = new Date();

            const repairOrder = await tx.repair.findUnique({
                where: { id: parseInt(repairId) },
                include: { receiver: true }
            });

            for (const itemData of itemsToReturn) {
                const { inventoryItemId, repairOutcome } = itemData;

                const repairItemRecord = await tx.repairOnItems.findUnique({
                    where: {
                        repairId_inventoryItemId: { repairId: parseInt(repairId), inventoryItemId: inventoryItemId }
                    },
                    include: { inventoryItem: true }
                });

                if (!repairItemRecord || repairItemRecord.inventoryItem.status !== 'REPAIRING') {
                    throw new Error(`Item ID ${inventoryItemId} is not valid for this repair order or is not in a REPAIRING state.`);
                }
                
                await tx.repairOnItems.update({
                    where: {
                        repairId_inventoryItemId: { repairId: parseInt(repairId), inventoryItemId: inventoryItemId }
                    },
                    data: { returnedAt: now, repairOutcome: repairOutcome },
                });

                const { inventoryItem } = repairItemRecord;
                let newStatus;
                
                if (inventoryItem.ownerType === ItemOwner.CUSTOMER) {
                    newStatus = ItemStatus.RETURNED_TO_CUSTOMER;
                } else {
                    if (repairOutcome === RepairOutcome.REPAIRED_SUCCESSFULLY) {
                        newStatus = inventoryItem.itemType === ItemType.ASSET ? ItemStatus.IN_WAREHOUSE : ItemStatus.IN_STOCK;
                    } else {
                        newStatus = ItemStatus.DECOMMISSIONED;
                    }
                }
                
                await tx.inventoryItem.update({
                    where: { id: inventoryItemId },
                    data: { status: newStatus },
                });

                await tx.assetHistory.create({
                    data: {
                        inventoryItemId,
                        userId: actorId,
                        type: HistoryEventType.REPAIR_RETURNED,
                        // --- START: ส่วนที่แก้ไข ---
                        details: `Returned from ${repairOrder?.receiver?.name || 'N/A'}. Outcome: ${repairOutcome}.`
                        // --- END ---
                    }
                });
            }

            const remainingItems = await tx.repairOnItems.count({
                where: { repairId: parseInt(repairId), returnedAt: null }
            });

            const newRepairStatus = remainingItems === 0 ? RepairStatus.COMPLETED : RepairStatus.PARTIALLY_RETURNED;
            
            await tx.repair.update({
                where: { id: parseInt(repairId) },
                data: { status: newRepairStatus },
            });
        });

        res.status(200).json({ message: 'Items have been returned successfully.' });
    } catch (error) {
        console.error("Return Items Error:", error);
        res.status(500).json({ error: error.message || 'Could not process the return.' });
    }
};

module.exports = repairController;