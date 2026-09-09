const NGOModel = require('../models/ngoModel');

const NGOController = {
    getAllNGOs: async (req, res) => {
        try {
            const ngos = await NGOModel.getAll();
            res.json(ngos);
        } catch (error) {
            console.error('Error fetching NGOs:', error);
            res.status(500).json({ error: 'Failed to fetch NGOs' });
        }
    },

    getNGOById: async (req, res) => {
        try {
            const { id } = req.params;
            const ngo = await NGOModel.getById(id);
            if (!ngo) {
                return res.status(404).json({ error: 'NGO not found' });
            }
            res.json(ngo);
        } catch (error) {
            console.error('Error fetching NGO by ID:', error);
            res.status(500).json({ error: 'Failed to fetch NGO' });
        }
    },

    createNGO: async (req, res) => {
        try {
            const { NGOName, isActive } = req.body;
            if (!NGOName) {
                return res.status(400).json({ error: 'NGO Name is required' });
            }
            const newNGO = await NGOModel.create(NGOName, isActive);
            res.status(201).json(newNGO);
        } catch (error) {
            console.error('Error creating NGO:', error);
            res.status(500).json({ error: 'Failed to create NGO' });
        }
    },

    updateNGO: async (req, res) => {
        try {
            const { id } = req.params;
            const { NGOName, isActive } = req.body;
            const updatedNGO = await NGOModel.update(id, NGOName, isActive);
            if (!updatedNGO) {
                return res.status(404).json({ error: 'NGO not found or no changes provided' });
            }
            res.json(updatedNGO);
        } catch (error) {
            console.error('Error updating NGO:', error);
            res.status(500).json({ error: 'Failed to update NGO' });
        }
    },

    deleteNGO: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedNGO = await NGOModel.delete(id);
            if (!deletedNGO) {
                return res.status(404).json({ error: 'NGO not found' });
            }
            res.json({ message: 'NGO deleted successfully', ngo: deletedNGO });
        } catch (error) {
            console.error('Error deleting NGO:', error);
            res.status(500).json({ error: 'Failed to delete NGO' });
        }
    }
};

module.exports = NGOController;
