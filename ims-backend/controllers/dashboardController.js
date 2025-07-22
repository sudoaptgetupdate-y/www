// controllers/dashboardController.js
const { PrismaClient, ItemType } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getDashboardStats = async (req, res, next) => { // <-- เพิ่ม next
    try {
        const soldItems = await prisma.inventoryItem.findMany({
            where: { status: 'SOLD', itemType: ItemType.SALE },
            include: {
                productModel: {
                    select: {
                        sellingPrice: true,
                    },
                },
            },
        });

        const totalRevenue = soldItems.reduce((sum, item) => {
            return sum + (item.productModel?.sellingPrice || 0);
        }, 0);

        const itemsInStock = await prisma.inventoryItem.count({
            where: { status: 'IN_STOCK', itemType: ItemType.SALE },
        });

        const totalAssets = await prisma.inventoryItem.count({
            where: { itemType: ItemType.ASSET }
        });
        const assignedAssets = await prisma.inventoryItem.count({
            where: { itemType: ItemType.ASSET, status: 'ASSIGNED' }
        });

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailySales = await prisma.sale.groupBy({
            by: ['saleDate'],
            _count: { id: true },
            where: { saleDate: { gte: sevenDaysAgo } },
            orderBy: { saleDate: 'asc' },
        });
        
        const salesChartData = dailySales.map(day => ({
            name: new Date(day.saleDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            total: day._count.id,
        }));

        const recentSales = await prisma.sale.findMany({
            take: 5,
            orderBy: { saleDate: 'desc' },
            include: {
                customer: { select: { name: true } },
                itemsSold: { include: { productModel: true } }
            },
        });

        const stockStatus = await prisma.inventoryItem.groupBy({
            where: { itemType: ItemType.SALE },
            by: ['status'],
            _count: { id: true },
        });

        res.status(200).json({
            totalRevenue,
            itemsInStock,
            totalAssets,
            assignedAssets,
            salesChartData,
            recentSales,
            stockStatus,
        });

    } catch (error) {
        next(error); // <-- ส่ง error ไปที่ Middleware
    }
};

exports.getEmployeeDashboardStats = async (req, res, next) => { // <-- เพิ่ม next
    try {
        const itemsInStock = await prisma.inventoryItem.count({
            where: { status: 'IN_STOCK', itemType: ItemType.SALE },
        });
        
        const defectiveItems = await prisma.inventoryItem.count({
            where: { 
                OR: [
                    { status: 'DEFECTIVE', itemType: ItemType.SALE },
                    { status: 'DEFECTIVE', itemType: ItemType.ASSET },
                ]
            },
        });

        const recentSales = await prisma.sale.findMany({
            take: 5,
            orderBy: { saleDate: 'desc' },
            include: {
                customer: { select: { name: true } },
                itemsSold: { select: { id: true } } 
            },
        });

        res.status(200).json({
            itemsInStock,
            defectiveItems,
            recentSales,
        });

    } catch (error) {
        next(error); // <-- ส่ง error ไปที่ Middleware
    }
};