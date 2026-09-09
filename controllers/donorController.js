const DonorModel = require('../models/donorModel');

const DonorController = {
    getAllDonors: async (req, res) => {
        try {
            const donors = await DonorModel.getAll();
            res.json(donors);
        } catch (error) {
            console.error('Error fetching donors:', error);
            res.status(500).json({ error: 'Failed to fetch donors' });
        }
    },

    getDonorById: async (req, res) => {
        try {
            const { id } = req.params;
            const donor = await DonorModel.getById(id);
            if (!donor) {
                return res.status(404).json({ error: 'Donor not found' });
            }
            res.json(donor);
        } catch (error) {
            console.error('Error fetching donor by ID:', error);
            res.status(500).json({ error: 'Failed to fetch donor' });
        }
    },

    createDonor: async (req, res) => {
        try {
            const { donorName, isActive } = req.body;
            if (!donorName) {
                return res.status(400).json({ error: 'Donor Name is required' });
            }
            const newDonor = await DonorModel.create(donorName, isActive);
            res.status(201).json(newDonor);
        } catch (error) {
            console.error('Error creating donor:', error);
            res.status(500).json({ error: 'Failed to create donor' });
        }
    },

    updateDonor: async (req, res) => {
        try {
            const { id } = req.params;
            const { donorName, isActive } = req.body;
            const updatedDonor = await DonorModel.update(id, donorName, isActive);
            if (!updatedDonor) {
                return res.status(404).json({ error: 'Donor not found or no changes provided' });
            }
            res.json(updatedDonor);
        } catch (error) {
            console.error('Error updating donor:', error);
            res.status(500).json({ error: 'Failed to update donor' });
        }
    },

    deleteDonor: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedDonor = await DonorModel.delete(id);
            if (!deletedDonor) {
                return res.status(404).json({ error: 'Donor not found' });
            }
            res.json({ message: 'Donor deleted successfully', donor: deletedDonor });
        } catch (error) {
            console.error('Error deleting donor:', error);
            res.status(500).json({ error: 'Failed to delete donor' });
        }
    }
};

module.exports = DonorController;
