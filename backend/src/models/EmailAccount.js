import mongoose from 'mongoose';
import { PROVIDERS, ACCOUNT_STATUS } from '../config/index.js';

const emailAccountSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seedKey: { type: String }, // a1, a2, a3 (used only by the seed file)
    provider: { type: String, enum: PROVIDERS, required: true },
    address: { type: String, required: true, lowercase: true, trim: true },
    label: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.CONNECTED,
    },
    lastSyncedAt: { type: Date },
    // New emails of this account go to this assistant by default
    defaultAssistantId: { type: String, uppercase: true, trim: true },
  },
  { timestamps: true }
);

emailAccountSchema.index({ ownerId: 1, address: 1 }, { unique: true });

export default mongoose.model('EmailAccount', emailAccountSchema);