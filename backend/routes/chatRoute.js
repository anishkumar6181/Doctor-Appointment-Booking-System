import express from 'express';
import Chat from '../models/chatModel.js';
import authUser from '../middlewares/authUser.js';
import authDoctor from '../middlewares/authDoctor.js';

const router = express.Router();

// Get chat history
router.get('/:appointmentId', async (req, res) => {
  try {
    const messages = await Chat.find({ appointmentId: req.params.appointmentId })
      .sort({ timestamp: 1 });
      
    res.json({ success: true, messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;