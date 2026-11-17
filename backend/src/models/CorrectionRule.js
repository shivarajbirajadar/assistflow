import mongoose from 'mongoose';
import { LABEL_VALUES } from '../config/index.js';

const correctionRuleSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Match by exact sender email, or by a whole domain (for example: kapoorfamily.in)
    senderEmail: { type: String, lowercase: true, trim: true },
    senderDomain: { type: String, lowercase: true, trim: true },
    forcedLabel: { type: String, enum: LABEL_VALUES, required: true },
    note: { type: String, default: '' },
    createdBy: { id: String, name: String },
    active: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

correctionRuleSchema.index({ ownerId: 1, senderEmail: 1 });
correctionRuleSchema.index({ ownerId: 1, senderDomain: 1 });

export default mongoose.model('CorrectionRule', correctionRuleSchema);