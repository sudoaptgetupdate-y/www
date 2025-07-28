// ims-backend/controllers/reportController.js

const prisma = require('../prisma/client');

exports.getSalesReport = async (req, res, next) => {
    try {
        const { year, month } = req.query;

        if (!year) {
            return res.status(400).json({ error: 'Year is a required query parameter.' });
        }

        const startDate = month && month !== 'all' ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
        const endDate = month && month !== 'all' ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);

        const whereClause = {
            status: 'COMPLETED',
            saleDate: {
                gte: startDate,
                lte: endDate,
            },
        };

        const salesData = await prisma.sale.findMany({
            where: whereClause,
            include: {
                itemsSold: {
                    include: {
                        productModel: true,
                    },
                },
                customer: true,
            },
        });

        const totalRevenue = salesData.reduce((sum, sale) => sum + sale.total, 0);
        const totalSales = salesData.length;

        const allItemsSold = salesData.flatMap(sale => sale.itemsSold);

        const productSales = allItemsSold.reduce((acc, item) => {
            const modelId = item.productModelId;
            if (!acc[modelId]) {
                acc[modelId] = {
                    count: 0,
                    revenue: 0,
                    modelNumber: item.productModel.modelNumber
                };
            }
            acc[modelId].count += 1;
            acc[modelId].revenue += item.productModel.sellingPrice;
            return acc;
        }, {});
        
        const top10Products = Object.entries(productSales)
            .sort(([, a], [, b]) => b.revenue - a.revenue)
            .slice(0, 10)
            .map(([id, data]) => ({
                productModelId: parseInt(id),
                modelNumber: data.modelNumber,
                totalRevenue: data.revenue,
                unitsSold: data.count
            }));

        const customerSales = salesData.reduce((acc, sale) => {
            if (!sale.customer) return acc;
            acc[sale.customerId] = (acc[sale.customerId] || 0) + sale.total;
            return acc;
        }, {});
        
        let topCustomer = null;
        if (Object.keys(customerSales).length > 0) {
            const topCustomerId = parseInt(Object.keys(customerSales).reduce((a, b) => customerSales[a] > customerSales[b] ? a : b));
            const customer = await prisma.customer.findUnique({ where: { id: topCustomerId } });
            topCustomer = customer ? customer.name : 'N/A';
        }

        let salesOverTime;
        if (month && month !== 'all') {
            salesOverTime = salesData.reduce((acc, sale) => {
                const day = new Date(sale.saleDate).getDate().toString();
                acc[day] = (acc[day] || 0) + sale.total;
                return acc;
            }, {});
            salesOverTime = Object.entries(salesOverTime).map(([name, total]) => ({ name, total }));
        } else {
            const monthlyData = Array.from({ length: 12 }, (_, i) => ({ name: new Date(0, i).toLocaleString('default', { month: 'short' }), total: 0 }));
            salesData.forEach(sale => {
                const monthIndex = new Date(sale.saleDate).getMonth();
                monthlyData[monthIndex].total += sale.total;
            });
            salesOverTime = monthlyData;
        }

        res.status(200).json({
            summary: {
                totalRevenue,
                totalSales,
                bestSellingProduct: top10Products[0]?.modelNumber || 'N/A',
                topCustomer
            },
            top10Products,
            salesOverTime,
            transactions: salesData
        });

    } catch (error) {
        next(error);
    }
};