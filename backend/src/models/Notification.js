import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  audience: { type: String, enum: ['assistants', 'owner', 'all'], default: 'all' },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
});

notificationSchema.index({ ownerId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);