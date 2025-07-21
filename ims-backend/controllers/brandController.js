// controllers/brandController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// สร้าง Brand ใหม่
exports.createBrand = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === "") {
            return res.status(400).json({ error: 'Name is required and cannot be empty' });
        }
        const newBrand = await prisma.brand.create({
            data: { name },
        });
        res.status(201).json(newBrand);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This brand name already exists.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not create the brand' });
    }
};

// ดู Brand ทั้งหมด (แก้ไขให้รองรับ all และ pagination)
exports.getAllBrands = async (req, res) => {
    try {
        // ลบเงื่อนไข ?all=true ออกไปทั้งหมด
        // ฟังก์ชันจะรองรับการค้นหาและแบ่งหน้าเป็นหลัก

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm
            ? { name: { contains: searchTerm } }
            : {};

        const [brands, totalItems] = await Promise.all([
            prisma.brand.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.brand.count({ where })
        ]);

        res.status(200).json({
            data: brands,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch brands' });
    }
};


// --- ฟังก์ชันอื่นๆ เหมือนเดิม ---

exports.getBrandById = async (req, res) => {
    try {
        const { id } = req.params;
        const brand = await prisma.brand.findUnique({
            where: { id: parseInt(id) },
        });

        if (!brand) {
            return res.status(404).json({ error: 'Brand not found' });
        }
        res.status(200).json(brand);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not fetch the brand' });
    }
};

exports.updateBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name || name.trim() === "") {
            return res.status(400).json({ error: 'Name is required and cannot be empty' });
        }
        const updatedBrand = await prisma.brand.update({
            where: { id: parseInt(id) },
            data: { name },
        });
        res.status(200).json(updatedBrand);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This brand name already exists.' });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'The brand you are trying to update was not found.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not update the brand' });
    }
};

exports.deleteBrand = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.brand.delete({
            where: { id: parseInt(id) },
        });
        res.status(204).send(); // No Content
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete this brand because it is being used by product models.' });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'The brand you are trying to delete was not found.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Could not delete the brand' });
    }
};