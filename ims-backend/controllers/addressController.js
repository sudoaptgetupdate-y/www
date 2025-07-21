// ims-backend/controllers/addressController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const addressController = {};

// POST /api/addresses - สร้างที่อยู่ใหม่
addressController.createAddress = async (req, res) => {
    try {
        const { name, contactPerson, phone, address } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required.' });
        }
        const newAddress = await prisma.address.create({
            data: { name, contactPerson, phone, address },
        });
        res.status(201).json(newAddress);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This address name already exists.' });
        }
        res.status(500).json({ error: 'Could not create the address.' });
    }
};

// GET /api/addresses - ดึงข้อมูลที่อยู่ทั้งหมด
addressController.getAllAddresses = async (req, res) => {
    try {
        if (req.query.all === 'true') {
            const allAddresses = await prisma.address.findMany({ orderBy: { name: 'asc' } });
            return res.status(200).json(allAddresses);
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm ? {
            OR: [
                { name: { contains: searchTerm } },
                { contactPerson: { contains: searchTerm } },
                { phone: { contains: searchTerm } },
            ],
        } : {};

        const [addresses, totalItems] = await prisma.$transaction([
            prisma.address.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
            prisma.address.count({ where }),
        ]);

        res.status(200).json({
            data: addresses,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit,
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch addresses.' });
    }
};

// GET /api/addresses/:id - ดึงข้อมูลที่อยู่เดียว
addressController.getAddressById = async (req, res) => {
    try {
        const { id } = req.params;
        const address = await prisma.address.findUnique({ where: { id: parseInt(id) } });
        if (!address) {
            return res.status(404).json({ error: 'Address not found.' });
        }
        res.status(200).json(address);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch the address.' });
    }
};

// PUT /api/addresses/:id - อัปเดตที่อยู่
addressController.updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contactPerson, phone, address } = req.body;
        const updatedAddress = await prisma.address.update({
            where: { id: parseInt(id) },
            data: { name, contactPerson, phone, address },
        });
        res.status(200).json(updatedAddress);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This address name already exists.' });
        }
        res.status(500).json({ error: 'Could not update the address.' });
    }
};

// DELETE /api/addresses/:id - ลบที่อยู่
addressController.deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.address.delete({ where: { id: parseInt(id) } });
        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2003') { // Foreign key constraint
            return res.status(400).json({ error: 'Cannot delete this address as it is currently in use in a repair order.' });
        }
        res.status(500).json({ error: 'Could not delete the address.' });
    }
};

module.exports = addressController;