// controllers/borrowingController.js
const { PrismaClient, EventType } = require('@prisma/client');
const prisma = new PrismaClient();
const borrowingController = {};

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

borrowingController.createBorrowing = async (req, res, next) => {
    const { customerId, inventoryItemIds, dueDate, notes } = req.body;
    const approvedById = req.user.id;

    if (typeof customerId !== 'number') {
        const err = new Error('Customer ID must be a number.');
        err.statusCode = 400;
        return next(err);
    }
    if (!Array.isArray(inventoryItemIds) || inventoryItemIds.length === 0 || inventoryItemIds.some(id => typeof id !== 'number')) {
        const err = new Error('inventoryItemIds must be a non-empty array of numbers.');
        err.statusCode = 400;
        return next(err);
    }
    if (dueDate && isNaN(Date.parse(dueDate))) {
        const err = new Error('Invalid due date format.');
        err.statusCode = 400;
        return next(err);
    }

    try {
        const newBorrowing = await prisma.$transaction(async (tx) => {
            const itemsToBorrow = await tx.inventoryItem.findMany({
                where: { id: { in: inventoryItemIds }, status: 'IN_STOCK' }
            });

            if (itemsToBorrow.length !== inventoryItemIds.length) {
                const err = new Error('One or more items are not available or not found.');
                err.statusCode = 400;
                throw err;
            }

            const customer = await tx.customer.findUnique({ where: { id: customerId } });
             if (!customer) {
                const err = new Error('Customer not found.');
                err.statusCode = 404;
                throw err;
            }

            const createdBorrowing = await tx.borrowing.create({
                data: {
                    borrowerId: customerId,
                    approvedById,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    notes,
                    status: 'BORROWED',
                },
            });
            
            await tx.borrowingOnItems.createMany({
                data: inventoryItemIds.map(itemId => ({
                    borrowingId: createdBorrowing.id,
                    inventoryItemId: itemId,
                })),
            });
            
            await tx.inventoryItem.updateMany({
                where: { id: { in: inventoryItemIds } },
                data: { status: 'BORROWED' },
            });

            for (const itemId of inventoryItemIds) {
                await createEventLog(
                    tx,
                    itemId,
                    approvedById,
                    EventType.BORROW,
                    {
                        borrowerName: customer.name,
                        borrowingId: createdBorrowing.id,
                        details: `Item borrowed by ${customer.name}.`
                    }
                );
            }

            return tx.borrowing.findUnique({
                where: { id: createdBorrowing.id },
                include: {
                    borrower: true,
                    approvedBy: { select: { id: true, name: true } },
                    items: { include: { inventoryItem: { include: { productModel: true } } } }
                }
            });
        });

        res.status(201).json(newBorrowing);

    } catch (error) {
        next(error);
    }
};

borrowingController.returnItems = async (req, res, next) => {
    const { borrowingId } = req.params;
    const { itemIdsToReturn } = req.body;
    const actorId = req.user.id;

    const id = parseInt(borrowingId);
    if (isNaN(id)) {
        const err = new Error('Invalid Borrowing ID.');
        err.statusCode = 400;
        return next(err);
    }
    if (!Array.isArray(itemIdsToReturn) || itemIdsToReturn.length === 0 || itemIdsToReturn.some(item => typeof item !== 'number')) {
        const err = new Error('itemIdsToReturn must be a non-empty array of numbers.');
        err.statusCode = 400;
        return next(err);
    }

    try {
        await prisma.$transaction(async (tx) => {
             const borrowing = await tx.borrowing.findUnique({
                where: { id: id },
                include: { borrower: true }
            });
            if (!borrowing) {
                const err = new Error('Borrowing record not found.');
                err.statusCode = 404;
                throw err;
            }

            await tx.borrowingOnItems.updateMany({
                where: {
                    borrowingId: id,
                    inventoryItemId: { in: itemIdsToReturn },
                },
                data: { returnedAt: new Date() },
            });
            
            await tx.inventoryItem.updateMany({
                where: { id: { in: itemIdsToReturn } },
                data: { status: 'IN_STOCK' },
            });

            for (const itemId of itemIdsToReturn) {
                await createEventLog(
                    tx,
                    itemId,
                    actorId,
                    EventType.RETURN_FROM_BORROW,
                    {
                        borrowerName: borrowing.borrower.name,
                        borrowingId: id,
                        details: `Item returned from ${borrowing.borrower.name}.`
                    }
                );
            }

            const remainingItems = await tx.borrowingOnItems.count({
                where: {
                    borrowingId: id,
                    returnedAt: null
                }
            });

            if (remainingItems === 0) {
                await tx.borrowing.update({
                    where: { id: id },
                    data: {
                        status: 'RETURNED',
                        returnDate: new Date(),
                    },
                });
            }
        });

        res.status(200).json({ message: 'Items returned successfully.' });

    } catch (error) {
        next(error);
    }
};

borrowingController.getAllBorrowings = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const sortBy = req.query.sortBy || 'borrowDate';
        const sortOrder = req.query.sortOrder || 'desc';

        let orderBy = {};
        if (sortBy === 'customer') {
            orderBy = { borrower: { name: sortOrder } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        const [borrowings, totalItems] = await prisma.$transaction([
            prisma.borrowing.findMany({
                skip,
                take: limit,
                orderBy,
                include: {
                    borrower: { select: { id: true, name: true } },
                    approvedBy: { select: { id: true, name: true } },
                    items: {
                        select: {
                            returnedAt: true
                        }
                    }
                }
            }),
            prisma.borrowing.count()
        ]);
        
        const formattedBorrowings = borrowings.map(b => {
            const totalItemCount = b.items.length;
            const returnedItemCount = b.items.filter(item => item.returnedAt !== null).length;
            const { items, ...rest } = b;
            return {
                ...rest,
                totalItemCount,
                returnedItemCount
            };
        });

        res.status(200).json({
            data: formattedBorrowings,
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

borrowingController.getBorrowingById = async (req, res, next) => {
    try {
        const { borrowingId } = req.params;
        
        const id = parseInt(borrowingId);
        if (isNaN(id)) {
            const err = new Error("Invalid Borrowing ID provided.");
            err.statusCode = 400;
            throw err;
        }

        const borrowing = await prisma.borrowing.findUnique({
            where: { id: id },
            include: {
                borrower: true,
                approvedBy: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        inventoryItem: {
                            include: {
                                productModel: {
                                    include: { brand: true, category: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!borrowing) {
            const err = new Error('Borrowing record not found');
            err.statusCode = 404;
            throw err;
        }

        const formattedBorrowing = {
            ...borrowing,
            items: borrowing.items.map(boi => ({
                ...boi.inventoryItem,
                returnedAt: boi.returnedAt,
                borrowingId: boi.borrowingId 
            }))
        };
        
        res.status(200).json(formattedBorrowing);

    } catch (error) {
        next(error);
    }
};

module.exports = borrowingController;