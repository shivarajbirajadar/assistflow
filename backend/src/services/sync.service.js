import Conversation from '../models/Conversation.js';
import EmailAccount from '../models/EmailAccount.js';

import { classifyConversation } from './classification.service.js';

import {
  LABELS,
  LABEL_SOURCES,
  ACTIONS,
  ACTOR_TYPES,
} from '../config/index.js';

import {
  emit,
  logActivity,
  EVENTS,
} from '../core/events.js';

// Normalize email address or person object
const getPerson = (value, fallbackName = '') => {
  if (!value) {
    return {
      name: fallbackName,
      email: '',
    };
  }

  if (typeof value === 'object') {
    return {
      name: value.name || fallbackName,
      email: value.email || '',
    };
  }

  return {
    name: fallbackName,
    email: String(value),
  };
};

// Get sender details from incoming email
const getSender = (email) => {
  const sender = email.from || {};

  if (typeof sender === 'object') {
    return {
      name: sender.name || email.senderName || 'Unknown Sender',
      email: (
        sender.email ||
        email.senderEmail ||
        ''
      ).toLowerCase(),
    };
  }

  return {
    name: email.senderName || 'Unknown Sender',
    email: String(
      email.senderEmail || sender || ''
    ).toLowerCase(),
  };
};

// Find existing conversation or create new one
const findOrCreateConversation = async (email, account) => {
  const seedKey = email.seedKey || email.threadId || email.id;

  let conversation = null;

  if (seedKey) {
    conversation = await Conversation.findOne({
      ownerId: account.ownerId,
      accountId: account._id,
      seedKey,
    });
  }

  if (!conversation) {
    conversation = new Conversation({
      ownerId: account.ownerId,
      accountId: account._id,
      seedKey: seedKey || undefined,
      subject: email.subject || '(No subject)',
      messages: [],
      label: LABELS.REVIEW,
      labelSource: LABEL_SOURCES.AI,
    });
  }

  return conversation;
};

// Add incoming email message
const addIncomingMessage = (conversation, email) => {
  const sender = getSender(email);

  const recipient = getPerson(
    email.to,
    ''
  );

  conversation.messages.push({
    direction: 'in',

    from: {
      name: sender.name,
      email: sender.email,
    },

    to: recipient,

    cc: Array.isArray(email.cc)
      ? email.cc.map((item) =>
          typeof item === 'object'
            ? item.email
            : String(item)
        )
      : [],

    body: email.body || email.text || '',

    attachments: Array.isArray(email.attachments)
      ? email.attachments
      : [],

    isForwarded: Boolean(email.isForwarded),

    sentAt: email.sentAt
      ? new Date(email.sentAt)
      : new Date(),
  });

  conversation.subject =
    email.subject || conversation.subject;

  conversation.refreshDerived();
};

// Apply AI classification
const applyClassification = (conversation, result) => {
  conversation.aiLabel = result.label;
  conversation.confidence = result.confidence;
  conversation.reason = result.reason || '';
  conversation.classifiedAt = new Date();

  conversation.labelSource =
    result.source || LABEL_SOURCES.AI;

  conversation.needsReview =
    result.label === LABELS.REVIEW;

  // Preserve manually locked labels
  if (conversation.lockedByUser) {
    if (conversation.label !== result.label) {
      conversation.aiSuggestion = {
        label: result.label,
        reason: result.reason || '',
        confidence: result.confidence,
        at: new Date(),
      };

      emit(EVENTS.AI_SUGGESTS_CHANGE, {
        ownerId: conversation.ownerId,
        conversationId: conversation._id,
        subject: conversation.subject,
        suggestedLabel: result.label,
      });
    }

    return;
  }

  conversation.label = result.label;
};

// Simulate one incoming email
export const simulateIncoming = async (email, ownerId) => {
  if (!email || !ownerId) {
    throw new Error('Email and owner ID are required.');
  }

  if (!email.accountId) {
    throw new Error('Email account ID is required.');
  }

  if (!email.body && !email.text) {
    throw new Error('Incoming email body is required.');
  }

  const account = await EmailAccount.findOne({
    _id: email.accountId,
    ownerId,
  });

  if (!account) {
    throw new Error('Connected email account not found.');
  }

  // Find or create conversation
  const conversation = await findOrCreateConversation(
    email,
    account
  );

  // Add incoming message
  addIncomingMessage(conversation, email);

  // Run AI classification
  const classification = await classifyConversation(
    conversation,
    ownerId
  );

  // Apply classification
  applyClassification(conversation, classification);

  // Save conversation
  await conversation.save();

  // Record activity
  logActivity({
    ownerId,
    conversationId: conversation._id,
    accountId: account._id,

    actor: {
      type: ACTOR_TYPES.SYSTEM,
      id: 'SYSTEM',
      name: 'Email Sync',
    },

    action: ACTIONS.AI_CLASSIFIED,
    to: conversation.label,
    note: `New email received: ${conversation.subject}`,
  });

  // Notify dashboard listeners
  emit(EVENTS.MESSAGE_RECEIVED, {
    ownerId,
    conversationId: conversation._id,
    subject: conversation.subject,
    label: conversation.label,
  });

  return {
    conversation,
    classification,
  };
};

// Simulate multiple incoming emails
export const simulateIncomingBatch = async (emails, ownerId) => {
  if (!Array.isArray(emails)) {
    throw new Error('Emails must be provided as an array.');
  }

  const results = [];

  for (const email of emails) {
    try {
      const result = await simulateIncoming(email, ownerId);

      results.push({
        success: true,
        conversationId: result.conversation._id,
        subject: result.conversation.subject,
        label: result.conversation.label,
      });

    } catch (error) {
      results.push({
        success: false,
        subject: email.subject || '(No subject)',
        error: error.message,
      });
    }
  }

  return {
    total: emails.length,
    successful: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
  };
};