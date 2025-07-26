// ims-backend/controllers/companyProfileController.js
const prisma = require('../prisma/client');

const getProfile = async (req, res, next) => {
    try {
        let profile = await prisma.companyProfile.findUnique({
            where: { id: 1 },
        });

        // If no profile exists, create a default one
        if (!profile) {
            profile = await prisma.companyProfile.create({
                data: {
                    id: 1,
                    name: 'Your Company Name',
                    addressLine1: '123 Your Street, Your City',
                    addressLine2: 'Your Province, Postal Code',
                    phone: 'Your Phone Number',
                    taxId: 'Your Tax ID'
                }
            });
        }
        res.status(200).json(profile);
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const profileData = req.body;
        const updatedProfile = await prisma.companyProfile.upsert({
            where: { id: 1 },
            update: profileData,
            create: { id: 1, ...profileData },
        });
        res.status(200).json(updatedProfile);
    } catch (error) {
        next(error);
    }
};

module.exports = { getProfile, updateProfile };