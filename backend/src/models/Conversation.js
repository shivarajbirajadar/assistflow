import mongoose from 'mongoose';
import {
  LABEL_VALUES,
  LABEL_SOURCES,
  OWNER_STATUS,
  DRAFT_STATUS,
} from '../config/index.js';

const { Schema } = mongoose;

const person = new Schema(
  { name: { type: String, default: '' }, email: { type: String, default: '' } },
  { _id: false }
);

const actorRef = new Schema({ id: String, name: String }, { _id: false });

const messageSchema = new Schema({
  direction: { type: String, enum: ['in', 'out'], required: true },
  from: person,
  to: person,
  cc: [String],
  body: { type: String, required: true },
  attachments: [String],
  isForwarded: { type: Boolean, default: false },
  sentAt: { type: Date, required: true },
  // For outgoing messages: which assistant (or the owner) replied
  sentBy: { type: actorRef, default: undefined },
});

const draftSchema = new Schema({
  body: { type: String, required: true },
  status: { type: String, enum: Object.values(DRAFT_STATUS), default: DRAFT_STATUS.DRAFT },
  generatedBy: { type: String, enum: ['ai', 'manual'], default: 'ai' },
  basedOnOwnerNote: { type: Boolean, default: false },
  createdBy: { type: actorRef, default: undefined },
  approvedBy: { type: actorRef, default: undefined },
  approvedAt: Date,
  sentAt: Date,
  createdAt: { type: Date, default: Date.now },
});

const conversationSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'EmailAccount', required: true, index: true },
    seedKey: { type: String },

    subject: { type: String, required: true, trim: true },
    messages: [messageSchema],
    drafts: [draftSchema],

    // ---- Derived fields, kept in sync by refreshDerived() (fast lists) ----
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, index: true },
    lastMessageDirection: { type: String, enum: ['in', 'out'] },
    lastIncomingAt: Date,
    snippet: { type: String, default: '' },
    fromName: { type: String, default: '' }, // the other party of the latest message
    fromEmail: { type: String, default: '' },
    repliedBy: { id: String, name: String, at: Date }, // "Replied by"
    waitingSince: Date,
    followUpCount: { type: Number, default: 0 },

    // ---- Classification ----
    label: { type: String, enum: LABEL_VALUES, default: 'needs_review', index: true },
    aiLabel: { type: String, enum: LABEL_VALUES }, // the AI's own answer, always kept
    labelSource: { type: String, enum: Object.values(LABEL_SOURCES), default: LABEL_SOURCES.AI },
    lockedByUser: { type: Boolean, default: false }, // set after a manual change
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    reason: { type: String, default: '' },
    needsReview: { type: Boolean, default: false },
    // When the label is locked and AI disagrees after a new message
    aiSuggestion: {
      label: { type: String, enum: LABEL_VALUES },
      reason: String,
      confidence: Number,
      at: Date,
    },
    classifiedAt: Date,

    // ---- AI summary (cached) ----
    summary: {
      text: String,
      keyPoints: [String],
      dates: [{ label: String, date: Date }],
      generatedAt: Date,
      messageCount: Number, // messages covered, used to detect a stale summary
    },

    // ---- Organisation ----
    tags: [String], // meeting, action_required, important, general, waiting_for_response
    isConfidential: { type: Boolean, default: false },
    confidentialCodename: String,
    isPhishing: { type: Boolean, default: false },
    dueDate: Date,
    meeting: { title: String, at: Date },

    // ---- Who handles it ("Handled by") ----
    assignedTo: { id: String, name: String },

    // ---- State ----
    isUnread: { type: Boolean, default: false },
    isStarred: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    archivedAt: Date,
    isCompleted: { type: Boolean, default: false },
    completedAt: Date,
    completedBy: { id: String, name: String },
    snoozedUntil: Date,

    // ---- Owner (client view) ----
    ownerStatus: {
      type: String,
      enum: Object.values(OWNER_STATUS),
      default: OWNER_STATUS.PENDING,
    },
    ownerNote: { type: String, default: '' },
    ownerActionAt: Date,

    // ---- Testing only, never sent to the UI ----
    expectedLabel: { type: String, enum: LABEL_VALUES, select: false },
    demo: { type: String, select: false },
  },
  { timestamps: true }
);

conversationSchema.index({ ownerId: 1, accountId: 1, label: 1 });
conversationSchema.index({ ownerId: 1, isArchived: 1, lastMessageAt: -1 });
conversationSchema.index({ ownerId: 1, 'assignedTo.id': 1 });

/** Recalculate the derived fields from messages. Call after messages change. */
conversationSchema.methods.refreshDerived = function () {
  const messages = [...this.messages].sort((a, b) => a.sentAt - b.sentAt);
  const last = messages[messages.length - 1];
  if (!last) return this;

  const lastIn = [...messages].reverse().find((m) => m.direction === 'in');
  const lastOut = [...messages].reverse().find((m) => m.direction === 'out');
  const other = last.direction === 'in' ? last.from : last.to;

  this.messageCount = messages.length;
  this.lastMessageAt = last.sentAt;
  this.lastMessageDirection = last.direction;
  this.lastIncomingAt = lastIn?.sentAt;
  this.snippet = last.body.replace(/\s+/g, ' ').trim().slice(0, 140);
  this.fromName = other?.name || '';
  this.fromEmail = other?.email || '';

  if (lastOut?.sentBy?.id) {
    this.repliedBy = { id: lastOut.sentBy.id, name: lastOut.sentBy.name, at: lastOut.sentAt };
  }

  if (last.direction === 'out') {
    const outAfterIncoming = messages.filter(
      (m) => m.direction === 'out' && (!lastIn || m.sentAt > lastIn.sentAt)
    );
    this.waitingSince = last.sentAt;
    this.followUpCount = Math.max(outAfterIncoming.length - 1, 0);
  } else {
    this.waitingSince = undefined;
    this.followUpCount = 0;
  }
  return this;
};

export default mongoose.model('Conversation', conversationSchema);