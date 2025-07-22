// ims-backend/controllers/assetAssignmentController.js

const { PrismaClient, HistoryEventType, AssignmentStatus } = require('@prisma/client');
const prisma = new PrismaClient();
const assetAssignmentController = {};

const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

assetAssignmentController.createAssignment = async (req, res, next) => {
    const { assigneeId, inventoryItemIds, notes } = req.body;
    const approvedById = req.user.id;

    // --- START: Input Validation ---
    if (typeof assigneeId !== 'number') {
        const err = new Error('Assignee ID must be a number.');
        err.statusCode = 400;
        return next(err);
    }
    if (!Array.isArray(inventoryItemIds) || inventoryItemIds.length === 0 || inventoryItemIds.some(id => typeof id !== 'number')) {
        const err = new Error('inventoryItemIds must be a non-empty array of numbers.');
        err.statusCode = 400;
        return next(err);
    }
    // --- END: Input Validation ---

    try {
        const newAssignment = await prisma.$transaction(async (tx) => {
            const itemsToAssign = await tx.inventoryItem.findMany({
                where: { 
                    id: { in: inventoryItemIds }, 
                    status: 'IN_WAREHOUSE',
                    itemType: 'ASSET'
                }
            });
            const assignee = await tx.user.findUnique({ where: { id: assigneeId } });

            if (!assignee) {
                const err = new Error('Assignee not found.');
                err.statusCode = 404;
                throw err;
            }
            if (itemsToAssign.length !== inventoryItemIds.length) {
                const err = new Error('One or more assets are not available or not found in the warehouse.');
                err.statusCode = 400;
                throw err;
            }

            const createdAssignment = await tx.assetAssignment.create({
                data: {
                    assigneeId,
                    approvedById,
                    notes,
                    status: 'ASSIGNED',
                },
            });
            
            await tx.assetAssignmentOnItems.createMany({
                data: inventoryItemIds.map(itemId => ({
                    assignmentId: createdAssignment.id,
                    inventoryItemId: itemId,
                })),
            });
            
            await tx.inventoryItem.updateMany({
                where: { id: { in: inventoryItemIds } },
                data: { status: 'ASSIGNED' },
            });

            // --- START: แก้ไขส่วนนี้ ---
            const historyEvents = inventoryItemIds.map(itemId => ({
                inventoryItemId: itemId,
                userId: approvedById,
                type: HistoryEventType.ASSIGN,
                details: `Assigned to ${assignee.name}. Assignment ID: ${createdAssignment.id}`
            }));
            // --- END: แก้ไขส่วนนี้ ---
            await tx.assetHistory.createMany({
                data: historyEvents
            });

            return createdAssignment;
        });

        res.status(201).json(newAssignment);

    } catch (error) {
        next(error);
    }
};

assetAssignmentController.returnItems = async (req, res, next) => {
    const { assignmentId } = req.params;
    const { itemIdsToReturn } = req.body;
    const actorId = req.user.id;

    // --- START: Input Validation ---
    const id = parseInt(assignmentId);
    if (isNaN(id)) {
        const err = new Error('Invalid Assignment ID.');
        err.statusCode = 400;
        return next(err);
    }
    if (!Array.isArray(itemIdsToReturn) || itemIdsToReturn.length === 0 || itemIdsToReturn.some(item => typeof item !== 'number')) {
        const err = new Error('itemIdsToReturn must be a non-empty array of numbers.');
        err.statusCode = 400;
        return next(err);
    }
    // --- END: Input Validation ---

    try {
        await prisma.$transaction(async (tx) => {
            const assignment = await tx.assetAssignment.findUnique({ where: { id: id }, include: { assignee: true } });
            if (!assignment) {
                const err = new Error('Assignment record not found.');
                err.statusCode = 404;
                throw err;
            }

            await tx.assetAssignmentOnItems.updateMany({
                where: {
                    assignmentId: id,
                    inventoryItemId: { in: itemIdsToReturn },
                },
                data: { returnedAt: new Date() },
            });
            
            await tx.inventoryItem.updateMany({
                where: { id: { in: itemIdsToReturn } },
                data: { status: 'IN_WAREHOUSE' },
            });

            // --- START: แก้ไขส่วนนี้ ---
            const historyEvents = itemIdsToReturn.map(itemId => ({
                inventoryItemId: itemId,
                userId: actorId,
                type: HistoryEventType.RETURN,
                details: `Returned from ${assignment.assignee?.name || 'N/A'}. Assignment ID: ${id}`
            }));
            // --- END: แก้ไขส่วนนี้ ---
            await tx.assetHistory.createMany({
                data: historyEvents
            });

            const remainingItems = await tx.assetAssignmentOnItems.count({
                where: {
                    assignmentId: id,
                    returnedAt: null
                }
            });

            let newStatus = remainingItems === 0 ? AssignmentStatus.RETURNED : AssignmentStatus.PARTIALLY_RETURNED;
            
            await tx.assetAssignment.update({
                where: { id: id },
                data: {
                    status: newStatus,
                    returnDate: newStatus === AssignmentStatus.RETURNED ? new Date() : null,
                },
            });
        });

        res.status(200).json({ message: 'Assets returned successfully.' });
    } catch (error) {
        next(error);
    }
};

// ... (โค้ดส่วนที่เหลือของไฟล์เหมือนเดิม)
assetAssignmentController.getAllAssignments = async (req, res, next) => {
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
                    { assignee: { name: { contains: searchTerm } } },
                    { id: { equals: parseInt(searchTerm) || 0 } }
                ]
            });
        }
        
        if(whereConditions.length > 0) {
            where.AND = whereConditions;
        }

        const [assignments, totalItems] = await Promise.all([
            prisma.assetAssignment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { assignedDate: 'desc' },
                include: {
                    assignee: { select: { id: true, name: true } },
                    approvedBy: { select: { id: true, name: true } },
                    items: {
                        select: {
                            returnedAt: true
                        }
                    }
                }
            }),
            prisma.assetAssignment.count({ where })
        ]);
        
        const formattedAssignments = assignments.map(a => {
            const totalItemCount = a.items.length;
            const returnedItemCount = a.items.filter(item => item.returnedAt !== null).length;
            const { items, ...rest } = a;
            return {
                ...rest,
                totalItemCount,
                returnedItemCount
            };
        });

        res.status(200).json({
            data: formattedAssignments,
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

assetAssignmentController.getAssignmentById = async (req, res, next) => {
    const { assignmentId } = req.params;
    try {
        const id = parseInt(assignmentId);
        if (isNaN(id)) {
            const err = new Error("Invalid Assignment ID.");
            err.statusCode = 400;
            throw err;
        }

        const assignment = await prisma.assetAssignment.findUnique({
            where: { id: id },
            include: {
                assignee: true,
                approvedBy: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        inventoryItem: {
                            include: {
                                productModel: true
                            }
                        }
                    }
                }
            }
        });

        if (!assignment) {
            const err = new Error('Assignment record not found');
            err.statusCode = 404;
            throw err;
        }
        
        res.status(200).json(assignment);
    } catch (error) {
        next(error);
    }
};

module.exports = assetAssignmentController;