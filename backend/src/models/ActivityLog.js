import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', index: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailAccount' },
  // Who did it: assistant (AST-101), owner (OWN-001), ai or system
  actor: {
    type: { type: String, enum: ['assistant', 'owner', 'ai', 'system'], required: true },
    id: String,
    name: String,
  },
  action: { type: String, required: true, index: true },
  from: String,
  to: String,
  note: String,
  createdAt: { type: Date, default: Date.now, index: true },
});

activityLogSchema.index({ ownerId: 1, createdAt: -1 });
activityLogSchema.index({ ownerId: 1, 'actor.id': 1, createdAt: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);