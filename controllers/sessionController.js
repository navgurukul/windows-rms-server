const SessionModel = require('../models/sessionModel');

const SessionController = {
    startSession: async (req, res) => {
        try {
            const { device_id } = req.body;
            
            if (!device_id) {
                return res.status(400).json({ error: 'device_id is required' });
            }
            
            const session = await SessionModel.startSession(device_id);
            res.status(201).json(session);
        } catch (error) {
            console.error('Error starting session:', error);
            res.status(500).json({ error: 'Failed to start session' });
        }
    },
    
    endSession: async (req, res) => {
        try {
            const { session_id } = req.params;
            
            if (!session_id) {
                return res.status(400).json({ error: 'session_id is required' });
            }
            
            const session = await SessionModel.endSession(session_id);
            
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
            
            res.json(session);
        } catch (error) {
            console.error('Error ending session:', error);
            res.status(500).json({ error: 'Failed to end session' });
        }
    }
};

module.exports = SessionController;