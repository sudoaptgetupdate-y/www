// controllers/categoryController.js
const prisma = require('../prisma/client');

exports.createCategory = async (req, res, next) => {
    try {
        const { name, requiresMacAddress, requiresSerialNumber } = req.body;

        // --- START: Input Validation ---
        if (typeof name !== 'string' || name.trim() === "") {
            const err = new Error('Name is required and cannot be empty');
            err.statusCode = 400;
            return next(err);
        }
        if (typeof requiresMacAddress !== 'boolean' || typeof requiresSerialNumber !== 'boolean') {
            const err = new Error('Invalid data format for switch values. They must be boolean.');
            err.statusCode = 400;
            return next(err);
        }
        // --- END: Input Validation ---

        const newCategory = await prisma.category.create({
            data: {
                name: name,
                requiresMacAddress: requiresMacAddress,
                requiresSerialNumber: requiresSerialNumber,
            },
        });

        res.status(201).json(newCategory);
    } catch (error) {
        next(error);
    }
};

exports.getAllCategories = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm
            ? { name: { contains: searchTerm } }
            : {};

        const [categories, totalItems] = await Promise.all([
            prisma.category.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.category.count({ where })
        ]);
        
        res.status(200).json({
            data: categories,
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

exports.getCategoryById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const categoryId = parseInt(id);
        if (isNaN(categoryId)) {
            const err = new Error('Invalid Category ID.');
            err.statusCode = 400;
            throw err;
        }

        const category = await prisma.category.findUnique({
            where: { id: categoryId },
        });

        if (!category) {
            const err = new Error('Category not found');
            err.statusCode = 404;
            throw err;
        }
        res.status(200).json(category);
    } catch (error) {
        next(error);
    }
};

exports.updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, requiresMacAddress, requiresSerialNumber } = req.body;

        const categoryId = parseInt(id);
        if (isNaN(categoryId)) {
            const err = new Error('Invalid Category ID.');
            err.statusCode = 400;
            throw err;
        }

        // --- START: Input Validation ---
        if (typeof name !== 'string' || name.trim() === "") {
            const err = new Error('Name is required and cannot be empty');
            err.statusCode = 400;
            return next(err);
        }
        if (typeof requiresMacAddress !== 'boolean' || typeof requiresSerialNumber !== 'boolean') {
            const err = new Error('Invalid data format for switch values. They must be boolean.');
            err.statusCode = 400;
            return next(err);
        }
        // --- END: Input Validation ---

        const updatedCategory = await prisma.category.update({
            where: { id: categoryId },
            data: { 
                name: name,
                requiresMacAddress: requiresMacAddress,
                requiresSerialNumber: requiresSerialNumber,
            },
        });
        res.status(200).json(updatedCategory);
    } catch (error) {
        next(error);
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const categoryId = parseInt(id);
        if (isNaN(categoryId)) {
            const err = new Error('Invalid Category ID.');
            err.statusCode = 400;
            throw err;
        }
        await prisma.category.delete({
            where: { id: categoryId },
        });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};