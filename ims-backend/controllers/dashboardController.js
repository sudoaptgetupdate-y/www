// controllers/dashboardController.js
const { PrismaClient, ItemType } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getDashboardStats = async (req, res, next) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [
            soldItems,
            itemsInStock,
            totalAssets,
            assignedAssets,
            dailySales,
            recentSales,
            stockStatus,
            // --- START: เพิ่มการดึงข้อมูลใหม่ ---
            recentBorrowings,
            recentRepairs,
            activeBorrowings,
            activeRepairs
            // --- END ---
        ] = await Promise.all([
            prisma.inventoryItem.findMany({
                where: { status: 'SOLD', itemType: ItemType.SALE },
                include: { productModel: { select: { sellingPrice: true } } },
            }),
            prisma.inventoryItem.count({
                where: { status: 'IN_STOCK', itemType: ItemType.SALE },
            }),
            prisma.inventoryItem.count({
                where: { itemType: ItemType.ASSET }
            }),
            prisma.inventoryItem.count({
                where: { itemType: ItemType.ASSET, status: 'ASSIGNED' }
            }),
            prisma.sale.groupBy({
                by: ['saleDate'],
                _count: { id: true },
                where: { saleDate: { gte: sevenDaysAgo } },
                orderBy: { saleDate: 'asc' },
            }),
            prisma.sale.findMany({
                take: 5,
                orderBy: { saleDate: 'desc' },
                include: {
                    customer: { select: { name: true } },
                    itemsSold: { include: { productModel: true } }
                },
            }),
            prisma.inventoryItem.groupBy({
                where: { itemType: ItemType.SALE },
                by: ['status'],
                _count: { id: true },
            }),
            // --- START: เพิ่ม Query สำหรับดึงข้อมูลใหม่ ---
            prisma.borrowing.findMany({
                take: 5,
                orderBy: { borrowDate: 'desc' },
                include: { borrower: { select: { name: true } } }
            }),
            prisma.repair.findMany({
                take: 5,
                orderBy: { repairDate: 'desc' },
                include: { receiver: { select: { name: true } } }
            }),
            prisma.borrowing.count({
                where: { status: 'BORROWED' }
            }),
            prisma.repair.count({
                where: { status: 'REPAIRING' }
            })
            // --- END ---
        ]);
        
        const totalRevenue = soldItems.reduce((sum, item) => {
            return sum + (item.productModel?.sellingPrice || 0);
        }, 0);

        const salesChartData = dailySales.map(day => ({
            name: new Date(day.saleDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            total: day._count.id,
        }));

        res.status(200).json({
            totalRevenue,
            itemsInStock,
            totalAssets,
            assignedAssets,
            salesChartData,
            recentSales,
            stockStatus,
            // --- START: เพิ่มข้อมูลใหม่ใน Response ---
            recentBorrowings,
            recentRepairs,
            activeBorrowings,
            activeRepairs
            // --- END ---
        });

    } catch (error) {
        next(error);
    }
};

exports.getEmployeeDashboardStats = async (req, res, next) => {
    try {
        const [itemsInStock, defectiveItems, recentSales] = await Promise.all([
            prisma.inventoryItem.count({
                where: { status: 'IN_STOCK', itemType: ItemType.SALE },
            }),
            prisma.inventoryItem.count({
                where: { 
                    OR: [
                        { status: 'DEFECTIVE', itemType: ItemType.SALE },
                        { status: 'DEFECTIVE', itemType: ItemType.ASSET },
                    ]
                },
            }),
            prisma.sale.findMany({
                take: 5,
                orderBy: { saleDate: 'desc' },
                include: {
                    customer: { select: { name: true } },
                    itemsSold: { select: { id: true } } 
                },
            })
        ]);

        res.status(200).json({
            itemsInStock,
            defectiveItems,
            recentSales,
        });

    } catch (error) {
        next(error);
    }
};