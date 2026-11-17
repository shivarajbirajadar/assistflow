import 'dotenv/config';
import mongoose from 'mongoose';

// ---------- Environment ----------
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

for (const key of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!env[key]) {
    console.error(`Missing environment variable: ${key}. Check backend/.env`);
    process.exit(1);
  }
}

// ---------- Feature flags (set false to switch a feature off) ----------
export const features = {
  notifications: true,
  triage: true,
  rules: true,
  snooze: true,
  simulate: true,
  bulkActions: true,
};

// ---------- Constants ----------
export const LABELS = {
  ASSISTANT: 'assistant_reply',
  CLIENT: 'client_reply',
  NONE: 'no_reply',
  REVIEW: 'needs_review',
};
export const LABEL_VALUES = Object.values(LABELS);

export const TAGS = {
  MEETING: 'meeting',
  ACTION: 'action_required',
  IMPORTANT: 'important',
  GENERAL: 'general',
  WAITING: 'waiting_for_response',
};
export const TAG_VALUES = Object.values(TAGS);

export const LABEL_SOURCES = {
  AI: 'ai',
  FALLBACK: 'fallback',
  ASSISTANT: 'assistant',
  OWNER: 'owner',
  RULE: 'rule',
};

export const PROVIDERS = ['gmail', 'outlook'];

export const ACCOUNT_STATUS = {
  CONNECTED: 'connected',
  SYNCING: 'syncing',
  NEEDS_REAUTH: 'needs_reauth',
  ERROR: 'error',
  DISCONNECTED: 'disconnected',
};

export const OWNER_STATUS = {
  PENDING: 'pending',
  HANDLED: 'handled',
  TAKEOVER: 'takeover',
};

export const DRAFT_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  SENT: 'sent',
};

export const ACTOR_TYPES = {
  ASSISTANT: 'assistant',
  OWNER: 'owner',
  AI: 'ai',
  SYSTEM: 'system',
};

export const ACTIONS = {
  AI_CLASSIFIED: 'ai_classified',
  AI_SUGGESTED: 'ai_suggested_change',
  LABEL_CHANGED: 'label_changed',
  LABEL_REVERTED: 'label_reverted',
  ASSIGNED: 'assigned',
  STARRED: 'starred',
  UNSTARRED: 'unstarred',
  MARKED_READ: 'marked_read',
  MARKED_UNREAD: 'marked_unread',
  ARCHIVED: 'archived',
  UNARCHIVED: 'unarchived',
  SNOOZED: 'snoozed',
  UNSNOOZED: 'unsnoozed',
  COMPLETED: 'marked_completed',
  REOPENED: 'reopened',
  DRAFT_CREATED: 'draft_created',
  DRAFT_APPROVED: 'draft_approved',
  REPLY_SENT: 'reply_sent',
  OWNER_HANDLED: 'owner_handled',
  OWNER_TAKEOVER: 'owner_takeover',
  RULE_CREATED: 'rule_created',
  ACCOUNT_ASSIGNED: 'account_assigned',
};

// Below this confidence the AI flags a conversation as "needs review"
export const CONFIDENCE_THRESHOLD = 0.65;

// ---------- Database ----------
export const connectDB = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};