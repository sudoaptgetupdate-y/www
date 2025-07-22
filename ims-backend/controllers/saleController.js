// controllers/saleController.js
const { PrismaClient, HistoryEventType } = require('@prisma/client');
const prisma = new PrismaClient();

const saleController = {};

saleController.createSale = async (req, res) => {
    const { customerId, inventoryItemIds } = req.body;
    const soldById = req.user.id; 

    if (!customerId || !inventoryItemIds || inventoryItemIds.length === 0) {
        return res.status(400).json({ error: 'Customer ID and at least one Item ID are required.' });
    }

    try {
        const sale = await prisma.$transaction(async (tx) => {
            const itemsToSell = await tx.inventoryItem.findMany({
                where: { 
                    id: { in: inventoryItemIds },
                    status: 'IN_STOCK' 
                },
                include: { productModel: { select: { sellingPrice: true } } },
            });

            if (itemsToSell.length !== inventoryItemIds.length) {
                throw new Error('One or more items are not available for sale or not found.');
            }

            const customer = await tx.customer.findUnique({ where: { id: customerId } });
            if (!customer) throw new Error('Customer not found.');

            const subtotal = itemsToSell.reduce((sum, item) => sum + (item.productModel?.sellingPrice || 0), 0);
            const vatAmount = subtotal * 0.07;
            const total = subtotal + vatAmount;

            const newSale = await tx.sale.create({
                data: {
                    customerId,
                    soldById,
                    subtotal,
                    vatAmount,
                    total,
                },
            });

            await tx.inventoryItem.updateMany({
                where: { id: { in: inventoryItemIds } },
                data: { status: 'SOLD', saleId: newSale.id },
            });

            const historyEvents = inventoryItemIds.map(itemId => ({
                inventoryItemId: itemId,
                userId: soldById,
                type: HistoryEventType.UPDATE, 
                details: `Item sold to ${customer.name}. Sale ID: ${newSale.id}`
            }));
            await tx.assetHistory.createMany({ data: historyEvents });

            return tx.sale.findUnique({
                where: { id: newSale.id },
                include: { 
                    customer: true, 
                    soldBy: { select: { name: true } },
                    itemsSold: { include: { productModel: true } } 
                }
            });
        });

        res.status(201).json(sale);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Could not complete the sale.' });
    }
};

saleController.getAllSales = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All'; 
        const skip = (page - 1) * limit;

        const whereConditions = [];

        if (statusFilter && statusFilter !== 'All') {
            whereConditions.push({ status: statusFilter });
        }

        if (searchTerm) {
            whereConditions.push({
                OR: [
                    { customer: { name: { contains: searchTerm } } },
                    { soldBy: { name: { contains: searchTerm } } }
                ]
            });
        }

        const where = whereConditions.length > 0 ? { AND: whereConditions } : {};
        
        const [sales, totalItems] = await Promise.all([
            prisma.sale.findMany({
                where,
                skip,
                take: limit,
                orderBy: { saleDate: 'desc' },
                include: {
                    customer: true,
                    soldBy: { select: { id: true, name: true } },
                    itemsSold: { select: { id: true } }
                }
            }),
            prisma.sale.count({ where })
        ]);
        
        // --- START: ส่วนที่แก้ไข ---
        // เพิ่มการกรองข้อมูลที่ไม่สมบูรณ์ออกไป
        const completeSalesData = sales.filter(sale => sale.customer && sale.soldBy);
        // --- END ---

        res.status(200).json({
            data: completeSalesData, // <-- ใช้ข้อมูลที่กรองแล้ว
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch sales.' });
    }
};


saleController.getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await prisma.sale.findUnique({
            where: { id: parseInt(id) },
            include: {
                customer: true,
                soldBy: { select: { id: true, name: true, email: true } },
                voidedBy: { select: { id: true, name: true } },
                itemsSold: {
                    include: {
                        productModel: {
                            include: {
                                brand: true,
                                category: true
                            }
                        }
                    }
                }
            }
        });

        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        res.status(200).json(sale);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch the sale.' });
    }
};

saleController.voidSale = async (req, res) => {
    const { id } = req.params;
    const voidedById = req.user.id;

    try {
        const voidedSale = await prisma.$transaction(async (tx) => {
            const saleToVoid = await tx.sale.findUnique({
                where: { id: parseInt(id) },
                include: { itemsSold: true },
            });

            if (!saleToVoid) throw new Error('Sale not found.');
            if (saleToVoid.status === 'VOIDED') throw new Error('This sale has already been voided.');

            const itemIdsToUpdate = saleToVoid.itemsSold.map(item => item.id);

            if (itemIdsToUpdate.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: itemIdsToUpdate } },
                    data: {
                        status: 'IN_STOCK',
                        saleId: null
                    },
                });

                const historyEvents = itemIdsToUpdate.map(itemId => ({
                    inventoryItemId: itemId,
                    userId: voidedById,
                    type: HistoryEventType.UPDATE,
                    details: `Sale ID ${id} voided. Item returned to stock.`
                }));
                await tx.assetHistory.createMany({ data: historyEvents });
            }

            return await tx.sale.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'VOIDED',
                    voidedAt: new Date(),
                    voidedById: voidedById,
                },
            });
        });

        res.status(200).json({ message: 'Sale has been voided successfully.', sale: voidedSale });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Could not void the sale.' });
    }
};

saleController.updateSale = async (req, res) => {
    const { id } = req.params;
    const { customerId, inventoryItemIds } = req.body;

    try {
        const updatedSale = await prisma.$transaction(async (tx) => {
            const originalSale = await tx.sale.findUnique({
                where: { id: parseInt(id) },
                include: { itemsSold: true },
            });

            if (!originalSale) throw new Error("Sale not found.");
            
            const originalItemIds = originalSale.itemsSold.map(item => item.id);
            if (originalItemIds.length > 0) {
                 await tx.inventoryItem.updateMany({
                    where: { id: { in: originalItemIds } },
                    data: { status: 'IN_STOCK', saleId: null },
                });
            }

             const itemsToSell = await tx.inventoryItem.findMany({
                where: { id: { in: inventoryItemIds } },
                include: { productModel: { select: { sellingPrice: true } } },
            });
            if (itemsToSell.length !== inventoryItemIds.length) {
                throw new Error('One or more new items are not available for sale.');
            }
            const subtotal = itemsToSell.reduce((sum, item) => sum + (item.productModel?.sellingPrice || 0), 0);
            const vatAmount = subtotal * 0.07;
            const total = subtotal + vatAmount;

            if (inventoryItemIds.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: inventoryItemIds } },
                    data: { status: 'SOLD', saleId: parseInt(id) },
                });
            }

            return await tx.sale.update({
                where: { id: parseInt(id) },
                data: {
                    customerId: customerId,
                    subtotal: subtotal,
                    vatAmount: vatAmount,
                    total: total,
                },
                include: { customer: true, soldBy: true, itemsSold: true },
            });
        });

        res.status(200).json(updatedSale);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || "Could not update the sale." });
    }
};

module.exports = saleController;