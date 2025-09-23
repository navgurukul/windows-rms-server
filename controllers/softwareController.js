const SoftwareModel = require('../models/softwareModel.js');

const SoftwareController = {

    getNotInstalledSoftwares: async (req, res) => {
        try {
            const { serial_number } = req.query;
            const notInstalledSoftwares = await SoftwareModel.getNotInstalledSoftwares(serial_number);
            return res.json(notInstalledSoftwares);
        } catch (error) {
            console.error('Error fetching not installed softwares:', error);
            res.status(500).json({ error: 'Failed to fetch not installed softwares' });
        }
    },

    addHistory: async (req, res) => {
        try {
            const { serial_number, software_name, isSuccessful } = req.body;
            const history = await SoftwareModel.addHistory(serial_number, software_name, isSuccessful);
            res.json(history);
        }
        catch (error) {
            console.error('Error adding history:', error);
            res.status(500).json({ error: 'Failed to add history' });
        }
    },
};

module.exports = SoftwareController;
