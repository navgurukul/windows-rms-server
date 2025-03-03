const UsageModel = require('../models/usageModel');

const UsageController = {
    getDailyUsage: async (req, res) => {
        try {
            const { device_id } = req.params;
            
            if (!device_id) {
                return res.status(400).json({ error: 'device_id is required' });
            }
            
            const usageData = await UsageModel.getDailyUsage(device_id);
            res.json(usageData);
        } catch (error) {
            console.error('Error fetching usage:', error);
            res.status(500).json({ error: 'Failed to fetch usage data' });
        }
    }
};

module.exports = UsageController;