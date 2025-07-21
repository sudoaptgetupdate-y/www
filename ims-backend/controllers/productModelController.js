// controllers/productModelController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- Create a new Product Model ---
exports.createProductModel = async (req, res) => {
    try {
        const { modelNumber, description, sellingPrice, categoryId, brandId } = req.body;
        const userId = req.user.id;

        const newProductModel = await prisma.productModel.create({
            data: {
                modelNumber,
                description,
                sellingPrice,
                categoryId,
                brandId,
                createdById: userId,
            },
        });
        res.status(201).json(newProductModel);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This model number already exists for this brand.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not create the product model' });
    }
};

// --- Get all Product Models (Paginated or All) ---
exports.getAllProductModels = async (req, res) => {
    try {
        const includeRelations = {
            category: true,
            brand: true,
            createdBy: {
                select: { id: true, name: true }
            }
        };

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm
            ? {
                OR: [
                    { modelNumber: { contains: searchTerm } },
                    { description: { contains: searchTerm } },
                    { brand: { name: { contains: searchTerm } } },
                    { category: { name: { contains: searchTerm } } }
                ]
            }
            : {};
        
        const [productModels, totalItems] = await Promise.all([
            prisma.productModel.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: includeRelations
            }),
            prisma.productModel.count({ where })
        ]);

        res.status(200).json({
            data: productModels,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch product models' });
    }
};

// --- Get a single Product Model by ID ---
exports.getProductModelById = async (req, res) => {
    try {
        const { id } = req.params;
        const productModel = await prisma.productModel.findUnique({
            where: { id: parseInt(id) },
            include: { 
                category: true, 
                brand: true,
                createdBy: { select: { id: true, name: true } }
            }
        });

        if (!productModel) {
            return res.status(404).json({ error: 'Product Model not found' });
        }
        res.status(200).json(productModel);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch the product model' });
    }
};

// --- Update a Product Model ---
exports.updateProductModel = async (req, res) => {
    try {
        const { id } = req.params;
        const { modelNumber, description, sellingPrice, categoryId, brandId } = req.body;

        const updatedProductModel = await prisma.productModel.update({
            where: { id: parseInt(id) },
            data: {
                modelNumber,
                description,
                sellingPrice,
                categoryId: parseInt(categoryId, 10),
                brandId: parseInt(brandId, 10),
            },
        });
        res.status(200).json(updatedProductModel);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This model number already exists for this brand.' });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'The product model you are trying to update was not found.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not update the product model' });
    }
};

// --- Delete a Product Model ---
exports.deleteProductModel = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.productModel.delete({
            where: { id: parseInt(id) },
        });
        res.status(204).send();
    } catch (error) {
         if (error.code === 'P2003') { // Foreign key constraint failed
            return res.status(400).json({ error: 'Cannot delete this model because it is linked to inventory items.' });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'The product model you are trying to delete was not found.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not delete the product model' });
    }
};