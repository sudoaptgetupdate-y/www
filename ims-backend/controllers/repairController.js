// ims-backend/controllers/repairController.js

const { PrismaClient, ItemStatus, ItemOwner, RepairStatus, RepairOutcome, ItemType, HistoryEventType } = require('@prisma/client');
const prisma = new PrismaClient();
const repairController = {};

repairController.createRepairOrder = async (req, res, next) => {
    const { senderId, receiverId, notes, items } = req.body;
    const createdById = req.user.id;

    if (typeof senderId !== 'number' || typeof receiverId !== 'number') {
        const err = new Error('Sender ID and Receiver ID must be numbers.');
        err.statusCode = 400;
        return next(err);
    }
    if (!Array.isArray(items) || items.length === 0) {
        const err = new Error('Items must be a non-empty array.');
        err.statusCode = 400;
        return next(err);
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
                            // --- START: นี่คือจุดที่แก้ไขและสำคัญที่สุด ---
                            ownerType: ItemOwner.CUSTOMER, // บังคับให้เป็นของลูกค้าเสมอ
                            // --- END: นี่คือจุดที่แก้ไขและสำคัญที่สุด ---
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
        next(error);
    }
};

// ... (โค้ดส่วนที่เหลือของไฟล์เหมือนเดิม)
repairController.getAllRepairOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All';

        let where = {};
        const whereConditions = [];

        if (statusFilter && statusFilter !== 'All') {
            whereConditions.push({ status: statusFilter });
        }
        
        if (searchTerm) {
            whereConditions.push({
                OR: [
                    { sender: { name: { contains: searchTerm } } },
                    { receiver: { name: { contains: searchTerm } } },
                    { id: { equals: parseInt(searchTerm) || 0 } }
                ]
            });
        }
        
        if(whereConditions.length > 0) {
            where.AND = whereConditions;
        }

        const [repairs, totalItems] = await Promise.all([
            prisma.repair.findMany({
                where,
                skip,
                take: limit,
                orderBy: { repairDate: 'desc' },
                include: {
                    sender: true,
                    receiver: true,
                    items: { select: { returnedAt: true } } 
                }
            }),
            prisma.repair.count({ where })
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
        next(error);
    }
};

repairController.getRepairOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const repairId = parseInt(id);
        if (isNaN(repairId)) {
            const err = new Error('Invalid Repair Order ID.');
            err.statusCode = 400;
            throw err;
        }

        const repairOrder = await prisma.repair.findUnique({
            where: { id: repairId },
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
            const err = new Error('Repair order not found.');
            err.statusCode = 404;
            throw err;
        }

        res.status(200).json(repairOrder);
    } catch (error) {
        next(error);
    }
};

repairController.returnItemsFromRepair = async (req, res, next) => {
    const { id: repairId } = req.params;
    const { itemsToReturn } = req.body;
    const actorId = req.user.id;

    const id = parseInt(repairId);
    if (isNaN(id)) {
        const err = new Error('Invalid Repair Order ID.');
        err.statusCode = 400;
        return next(err);
    }
    if (!Array.isArray(itemsToReturn) || itemsToReturn.length === 0) {
        const err = new Error('itemsToReturn must be a non-empty array.');
        err.statusCode = 400;
        return next(err);
    }
    const validOutcomes = Object.values(RepairOutcome);
    for (const item of itemsToReturn) {
        if (typeof item.inventoryItemId !== 'number' || !validOutcomes.includes(item.repairOutcome)) {
            const err = new Error('Each item in itemsToReturn must have a numeric inventoryItemId and a valid repairOutcome.');
            err.statusCode = 400;
            return next(err);
        }
    }

    try {
        await prisma.$transaction(async (tx) => {
            const now = new Date();

            const repairOrder = await tx.repair.findUnique({
                where: { id: id },
                include: { receiver: true }
            });

            for (const itemData of itemsToReturn) {
                const { inventoryItemId, repairOutcome } = itemData;

                const repairItemRecord = await tx.repairOnItems.findUnique({
                    where: {
                        repairId_inventoryItemId: { repairId: id, inventoryItemId: inventoryItemId }
                    },
                    include: { inventoryItem: true }
                });

                if (!repairItemRecord || repairItemRecord.inventoryItem.status !== 'REPAIRING') {
                    throw new Error(`Item ID ${inventoryItemId} is not valid for this repair order or is not in a REPAIRING state.`);
                }
                
                await tx.repairOnItems.update({
                    where: {
                        repairId_inventoryItemId: { repairId: id, inventoryItemId: inventoryItemId }
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
                        details: `Returned from ${repairOrder?.receiver?.name || 'N/A'}. Outcome: ${repairOutcome}.`
                    }
                });
            }

            const remainingItems = await tx.repairOnItems.count({
                where: { repairId: id, returnedAt: null }
            });

            const newRepairStatus = remainingItems === 0 ? RepairStatus.COMPLETED : RepairStatus.PARTIALLY_RETURNED;
            
            await tx.repair.update({
                where: { id: id },
                data: { status: newRepairStatus },
            });
        });

        res.status(200).json({ message: 'Items have been returned successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = repairController;