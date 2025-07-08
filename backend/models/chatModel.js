import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  appointmentId: { type: String, required: true },
  senderId: { type: String, required: true }, // userId or docId
  senderType: { type: String, enum: ['patient', 'doctor'], required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
export default Chat;