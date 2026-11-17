// ---------- Feature Flags ----------

export const FEATURES = {
  AI_SUMMARIES: true,
  AI_CLASSIFICATION: true,
  AI_DRAFTS: true,
  ASK_AI: true,
  TEAM_ACTIVITY: true,
  CLIENT_VIEW: true,
  EMAIL_SYNC: true,
  NOTIFICATIONS: true,
  LEARNED_RULES: true,
};


// ---------- Email Labels ----------

export const LABELS = {
  CLIENT_TO_REPLY: {
    value: 'client_to_reply',
    label: 'Client to Reply',
  },
  ASSISTANT_TO_REPLY: {
    value: 'assistant_to_reply',
    label: 'Assistant to Reply',
  },
  NO_REPLY_NEEDED: {
    value: 'no_reply_needed',
    label: 'No Reply Needed',
  },
  NEEDS_REVIEW: {
    value: 'needs_review',
    label: 'Needs Review',
  },
  ACTION_REQUIRED: {
    value: 'action_required',
    label: 'Action Required',
  },
  WAITING: {
    value: 'waiting',
    label: 'Waiting',
  },
  MEETING: {
    value: 'meeting',
    label: 'Meetings',
  },
  IMPORTANT: {
    value: 'important',
    label: 'Important',
  },
  GENERAL: {
    value: 'general',
    label: 'General',
  },
  ARCHIVED: {
    value: 'archived',
    label: 'Archived',
  },
};

export const LABEL_OPTIONS = Object.values(LABELS);


// ---------- Inbox Segments ----------

export const SEGMENTS = [
  {
    id: 'client-to-reply',
    label: 'Client to Reply',
    value: LABELS.CLIENT_TO_REPLY.value,
    icon: 'client',
  },
  {
    id: 'assistant-to-reply',
    label: 'Assistant to Reply',
    value: LABELS.ASSISTANT_TO_REPLY.value,
    icon: 'assistant',
  },
  {
    id: 'no-reply-needed',
    label: 'No Reply Needed',
    value: LABELS.NO_REPLY_NEEDED.value,
    icon: 'check',
  },
  {
    id: 'needs-review',
    label: 'Needs Review',
    value: LABELS.NEEDS_REVIEW.value,
    icon: 'review',
  },
  {
    id: 'action-required',
    label: 'Action Required',
    value: LABELS.ACTION_REQUIRED.value,
    icon: 'action',
  },
  {
    id: 'waiting',
    label: 'Waiting',
    value: LABELS.WAITING.value,
    icon: 'clock',
  },
  {
    id: 'meetings',
    label: 'Meetings',
    value: LABELS.MEETING.value,
    icon: 'calendar',
  },
  {
    id: 'important',
    label: 'Important',
    value: LABELS.IMPORTANT.value,
    icon: 'important',
  },
  {
    id: 'general',
    label: 'General',
    value: LABELS.GENERAL.value,
    icon: 'inbox',
  },
  {
    id: 'archived',
    label: 'Archived',
    value: LABELS.ARCHIVED.value,
    icon: 'archive',
  },
];


// ---------- Sidebar Navigation ----------

export const NAVIGATION = [
  {
    id: 'overview',
    label: 'Overview',
    path: '/',
    icon: 'overview',
    section: 'main',
  },
  {
    id: 'inbox',
    label: 'Inbox',
    path: '/inbox',
    icon: 'inbox',
    section: 'main',
  },
  {
    id: 'triage',
    label: 'Needs Review',
    path: '/triage',
    icon: 'review',
    section: 'workspace',
  },
  {
    id: 'team',
    label: 'Team',
    path: '/team',
    icon: 'team',
    section: 'workspace',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'settings',
    section: 'workspace',
  },
];


// ---------- Application Constants ----------

export const APP_CONFIG = {
  APP_NAME: 'Personal Assistant',
  DEFAULT_PAGE_SIZE: 20,
  SEARCH_DEBOUNCE_MS: 350,
  POLLING_INTERVAL_MS: 30000,
  TOAST_DURATION_MS: 4000,
  DEFAULT_ACCOUNT: 'all',
};

export const ACTOR_TYPES = {
  OWNER: 'owner',
  ASSISTANT: 'assistant',
};

export const ACCOUNT_PROVIDERS = {
  GMAIL: 'gmail',
  OUTLOOK: 'outlook',
};

export const OWNER_STATUS = {
  NONE: 'none',
  NEEDS_ATTENTION: 'needs_attention',
  HANDLED: 'handled',
};