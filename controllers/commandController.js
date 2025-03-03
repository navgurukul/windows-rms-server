
const CommandModel = require('../models/commandModel');

const CommandController = {
    getPendingCommands: async (req, res) => {
        try {
            const { device_id } = req.params;
            
            if (!device_id) {
                return res.status(400).json({ error: 'device_id is required' });
            }
            
            const commands = await CommandModel.getPendingCommands(device_id);
            res.json(commands);
        } catch (error) {
            console.error('Error fetching commands:', error);
            res.status(500).json({ error: 'Failed to fetch commands' });
        }
    },
    
    markCommandExecuted: async (req, res) => {
        try {
            const { command_id } = req.params;
            
            if (!command_id) {
                return res.status(400).json({ error: 'command_id is required' });
            }
            
            const command = await CommandModel.markAsExecuted(command_id);
            
            if (!command) {
                return res.status(404).json({ error: 'Command not found' });
            }
            
            res.json(command);
        } catch (error) {
            console.error('Error marking command as executed:', error);
            res.status(500).json({ error: 'Failed to update command status' });
        }
    }
};

module.exports = CommandController;