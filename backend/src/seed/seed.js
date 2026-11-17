import 'dotenv/config';

import mongoose from 'mongoose';

import User from '../models/User.js';
import EmailAccount from '../models/EmailAccount.js';
import Conversation from '../models/Conversation.js';
import ActivityLog from '../models/ActivityLog.js';

import {
  connectDB,
  LABELS,
  LABEL_SOURCES,
  OWNER_STATUS,
  ACTIONS,
  ACTOR_TYPES,
} from '../config/index.js';

import { classifyConversation } from '../services/classification.service.js';
import { summarizeConversation } from '../services/ai.service.js';

import ownerData from './owner.json' with { type: 'json' };
import emailsData from './emails.json' with { type: 'json' };

const DELAY_MS = 1500;
const MAX_RETRIES = 3;

const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Convert daysAgo and time into an IST-based Date
const getRelativeDate = (daysAgo = 0, time = '09:00') => {
  const [hours, minutes] = time.split(':').map(Number);

  const istNow = new Date(Date.now() + 330 * 60 * 1000);

  return new Date(
    Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate() - Number(daysAgo || 0),
      (hours || 0) - 5,
      (minutes || 0) - 30
    )
  );
};

// Convert future days into an IST-based Date
const getFutureDate = (days = 0, time = '09:00') => {
  const [hours, minutes] = time.split(':').map(Number);

  const istNow = new Date(Date.now() + 330 * 60 * 1000);

  return new Date(
    Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate() + Number(days || 0),
      (hours || 0) - 5,
      (minutes || 0) - 30
    )
  );
};

// Retry an operation if it temporarily fails
const withRetry = async (operation, retries = MAX_RETRIES) => {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      console.log(
        `[Seed] Attempt ${attempt}/${retries} failed: ${error.message}`
      );

      if (attempt < retries) {
        await wait(DELAY_MS * attempt);
      }
    }
  }

  throw lastError;
};

// Get owner information
const getOwnerData = () => {
  return ownerData.owner || ownerData.user || ownerData;
};

// Get assistant information
const getAssistantsData = () => {
  return ownerData.assistants || [];
};

// Get account information
const getAccountsData = () => {
  return ownerData.accounts || ownerData.emailAccounts || [];
};

// Get conversation information
const getEmailsData = () => {
  if (Array.isArray(emailsData)) {
    return emailsData;
  }

  return (
    emailsData.conversations ||
    emailsData.emails ||
    emailsData.items ||
    []
  );
};

// Create or update demo owner
const seedOwner = async () => {
  const data = getOwnerData();
  const assistants = getAssistantsData();

  if (!data.email || !data.password) {
    throw new Error('Owner email or password is missing in owner.json');
  }

  let user = await User.findOne({
    email: data.email.toLowerCase(),
  }).select('+password');

  const ownerFields = {
    name: data.name,
    email: data.email.toLowerCase(),
    title: data.title,
    company: data.company,
    actorId: data.actorId || 'OWN-001',
    assistants: assistants.map((assistant) => ({
      assistantId: assistant.assistantId,
      name: assistant.name,
    })),
  };

  if (!user) {
    user = await User.create({
      ...ownerFields,
      password: data.password,
    });
  } else {
    Object.assign(user, ownerFields);

    const passwordMatches = await user.comparePassword(data.password);

    if (!passwordMatches) {
      user.password = data.password;
    }

    await user.save();
  }

  console.log(`[Seed] Owner ready: ${user.email}`);
  console.log(`[Seed] Assistants ready: ${assistants.length}`);

  return user;
};

// Create or update email accounts
const seedAccounts = async (ownerId) => {
  const accountsData = getAccountsData();

  if (!accountsData.length) {
    throw new Error('No email accounts found in owner.json');
  }

  const accountMap = new Map();

  for (const data of accountsData) {
    const account = await EmailAccount.findOneAndUpdate(
      {
        ownerId,
        address: data.address.toLowerCase(),
      },
      {
        $set: {
          seedKey: data.key || data.seedKey,
          provider: data.provider,
          address: data.address.toLowerCase(),
          label: data.label,
          status: data.status || 'connected',
          defaultAssistantId: data.defaultAssistantId,
          lastSyncedAt: data.lastSyncedMinutesAgo !== undefined
            ? new Date(
                Date.now() -
                Number(data.lastSyncedMinutesAgo) * 60 * 1000
              )
            : undefined,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    const key = data.key || data.seedKey;

    if (key) {
      accountMap.set(String(key), account);
    }
  }

  console.log(`[Seed] ${accountMap.size} email accounts ready`);

  return accountMap;
};

// Find the correct account for a conversation
const getAccountForEmail = (email, accountMap) => {
  const key = email.accountKey || email.accountSeedKey || email.accountId;

  if (key && accountMap.has(String(key))) {
    return accountMap.get(String(key));
  }

  throw new Error(
    `Email account not found for conversation: ${email.subject}`
  );
};

// Convert message data into schema-compatible format
const prepareMessages = (messages, assistants, owner) => {
  return messages.map((message) => {
    let sentBy;

    if (message.sentBy) {
      const assistant = assistants.find(
        (item) => item.assistantId === message.sentBy
      );

      sentBy = {
        id: message.sentBy,
        name:
          assistant?.name ||
          (message.sentBy === owner.actorId
            ? owner.name
            : message.sentBy),
      };
    }

    return {
      direction: message.direction,

      from: {
        name: message.from?.name || '',
        email: message.from?.email || '',
      },

      to: {
        name: message.to?.name || '',
        email: message.to?.email || '',
      },

      cc: message.cc || [],
      body: message.body || '',
      attachments: message.attachments || [],
      isForwarded: Boolean(message.isForwarded),

      sentAt: getRelativeDate(
        message.daysAgo,
        message.time
      ),

      sentBy,
    };
  });
};

// Prepare meeting information
const prepareMeeting = (meeting) => {
  if (!meeting) return undefined;

  return {
    title: meeting.title || '',
    at: getFutureDate(
      meeting.inDays,
      meeting.time
    ),
  };
};

// Prepare owner action information
const prepareOwnerAction = (ownerAction) => {
  if (!ownerAction) {
    return {
      ownerStatus: OWNER_STATUS.PENDING,
      ownerNote: '',
      ownerActionAt: undefined,
    };
  }

  return {
    ownerStatus: ownerAction.status || OWNER_STATUS.PENDING,
    ownerNote: ownerAction.note || '',
    ownerActionAt: getRelativeDate(
      ownerAction.daysAgo,
      ownerAction.time
    ),
  };
};

// Prepare conversation document
const prepareConversation = (
  email,
  ownerId,
  account,
  assistants,
  owner
) => {
  if (!email.messages?.length) {
    throw new Error(
      `Conversation has no messages: ${email.subject || 'Unknown subject'}`
    );
  }

  const ownerAction = prepareOwnerAction(email.ownerAction);

  const conversation = new Conversation({
    ownerId,
    accountId: account._id,

    seedKey: email.key || email.seedKey || email.id,

    subject: email.subject || '(No subject)',

    messages: prepareMessages(
      email.messages,
      assistants,
      owner
    ),

    expectedLabel: email.expectedLabel || email.label,

    label: LABELS.REVIEW,

    isUnread: Boolean(email.isUnread),
    isStarred: Boolean(email.isStarred),
    isArchived: Boolean(email.isArchived),
    isCompleted: Boolean(email.isCompleted),

    isConfidential: Boolean(email.confidentialCodename),
    confidentialCodename: email.confidentialCodename || '',
    isPhishing: Boolean(email.isPhishing),

    tags: email.tags || [],

    assignedTo: email.assignedTo
      ? {
          id: email.assignedTo,
          name:
            assistants.find(
              (assistant) =>
                assistant.assistantId === email.assignedTo
            )?.name || email.assignedTo,
        }
      : undefined,

    ownerStatus: ownerAction.ownerStatus,
    ownerNote: ownerAction.ownerNote,
    ownerActionAt: ownerAction.ownerActionAt,

    dueDate: email.dueInDays !== undefined
      ? getFutureDate(email.dueInDays)
      : undefined,

    meeting: prepareMeeting(email.meeting),

    snoozedUntil: email.snoozedForDays !== undefined
      ? getFutureDate(email.snoozedForDays)
      : undefined,

    demo: email.demo || undefined,
  });

  conversation.refreshDerived();

  return conversation;
};

// Preserve user changes when updating existing conversations
const preserveExistingState = (existing, prepared) => {
  const fieldsToPreserve = [
    'drafts',
    'lockedByUser',
    'isUnread',
    'isStarred',
    'isArchived',
    'isCompleted',
    'assignedTo',
    'ownerStatus',
    'ownerNote',
    'ownerActionAt',
    'snoozedUntil',
  ];

  const preserved = {};

  for (const field of fieldsToPreserve) {
    preserved[field] = existing[field];
  }

  existing.set(prepared.toObject());

  for (const field of fieldsToPreserve) {
    existing[field] = preserved[field];
  }

  return existing;
};

// Process AI classification and summary
const processConversation = async (conversation) => {
  const classification = await withRetry(() =>
    classifyConversation(
      conversation,
      conversation.ownerId
    )
  );

  conversation.aiLabel = classification.label;

  if (conversation.lockedByUser) {
    conversation.aiSuggestion = {
      label: classification.label,
      confidence: classification.confidence,
      reason: classification.reason,
    };
  } else {
    conversation.label = classification.label;
    conversation.labelSource =
      classification.source || LABEL_SOURCES.AI;
  }

  conversation.confidence = classification.confidence;
  conversation.reason = classification.reason;

  conversation.needsReview =
    classification.label === LABELS.REVIEW;

  conversation.classifiedAt = new Date();

  if (classification.tags?.length) {
    conversation.tags = [
      ...new Set([
        ...conversation.tags,
        ...classification.tags,
      ]),
    ];
  }

  const summary = await withRetry(() =>
    summarizeConversation(conversation)
  );

  const importantDates = Array.isArray(summary.importantDates)
    ? summary.importantDates
    : [];

  const dates = importantDates
    .map((item) => {
      const value = typeof item === 'string'
        ? item
        : item.date;

      const parsedDate = new Date(value);

      if (!value || Number.isNaN(parsedDate.getTime())) {
        return null;
      }

      return {
        label: typeof item === 'string'
          ? 'Important date'
          : item.label || 'Important date',
        date: parsedDate,
      };
    })
    .filter(Boolean);

  conversation.summary = {
    text: summary.summary || classification.summary || '',
    keyPoints: [
      ...(summary.keyPoints || []),
      ...(summary.actionItems || []),
    ],
    dates,
    generatedAt: new Date(),
    messageCount: conversation.messageCount,
  };

  await conversation.save();

  return classification;
};

// Convert activity action into configured action value
const getActivityAction = (action) => {
  const normalized = String(action || '')
    .trim()
    .toLowerCase();

  const matched = Object.entries(ACTIONS).find(
    ([key, value]) =>
      key.toLowerCase() === normalized ||
      String(value).toLowerCase() === normalized
  );

  return matched?.[1] || null;
};

// Prepare actor information for activity
const getActivityActor = (actorId, assistants, owner) => {
  const assistant = assistants.find(
    (item) => item.assistantId === actorId
  );

  if (assistant) {
    return {
      type: ACTOR_TYPES.ASSISTANT,
      id: assistant.assistantId,
      name: assistant.name,
    };
  }

  if (actorId === owner.actorId) {
    return {
      type: ACTOR_TYPES.OWNER,
      id: owner.actorId,
      name: owner.name,
    };
  }

  return {
    type: ACTOR_TYPES.SYSTEM,
    id: actorId || 'SYSTEM',
    name: 'System',
  };
};

// Seed activities for a newly created conversation
const seedActivities = async (
  email,
  conversation,
  assistants,
  owner
) => {
  const activities = [];

  // Activities explicitly provided in emails.json
  for (const activity of email.activity || []) {
    const action = getActivityAction(activity.action);

    if (!action) {
      console.log(
        `[Seed] Skipping unsupported activity: ${activity.action}`
      );
      continue;
    }

    activities.push({
      ownerId: conversation.ownerId,
      conversationId: conversation._id,
      accountId: conversation.accountId,

      actor: getActivityActor(
        activity.by,
        assistants,
        owner
      ),

      action,
      from: activity.from,
      to: activity.to,

      createdAt: getRelativeDate(
        activity.daysAgo,
        activity.time
      ),
    });
  }

  // Generate activity for assistant-sent replies
  for (const message of email.messages || []) {
    if (
      message.direction !== 'out' ||
      !message.sentBy
    ) {
      continue;
    }

    const assistant = assistants.find(
      (item) => item.assistantId === message.sentBy
    );

    if (!assistant) {
      continue;
    }

    activities.push({
      ownerId: conversation.ownerId,
      conversationId: conversation._id,
      accountId: conversation.accountId,

      actor: {
        type: ACTOR_TYPES.ASSISTANT,
        id: assistant.assistantId,
        name: assistant.name,
      },

      action: ACTIONS.REPLY_SENT,

      createdAt: getRelativeDate(
        message.daysAgo,
        message.time
      ),
    });
  }

  if (activities.length) {
    await ActivityLog.insertMany(activities);
  }

  return activities.length;
};

// Seed all conversations
const seedConversations = async (
  owner,
  accountMap,
  assistants
) => {
  const emails = getEmailsData();

  if (!emails.length) {
    throw new Error('No conversations found in emails.json');
  }

  let correct = 0;
  let compared = 0;
  let failed = 0;
  let fallbackCount = 0;
  let activityCount = 0;

  console.log(
    `\n[Seed] Processing ${emails.length} conversations...\n`
  );

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    try {
      const account = getAccountForEmail(
        email,
        accountMap
      );

      const prepared = prepareConversation(
        email,
        owner._id,
        account,
        assistants,
        owner
      );

      const seedKey = email.key || email.seedKey || email.id;

      let conversation = await Conversation.findOne({
        ownerId: owner._id,
        seedKey,
      });

      const isNew = !conversation;

      if (conversation) {
        conversation = preserveExistingState(
          conversation,
          prepared
        );
      } else {
        conversation = prepared;
      }

      const classification = await processConversation(
        conversation
      );

      if (isNew) {
        const createdActivities = await seedActivities(
          email,
          conversation,
          assistants,
          owner
        );

        activityCount += createdActivities;
      }

      const expectedLabel =
        email.expectedLabel || email.label;

      if (expectedLabel) {
        compared++;

        if (classification.label === expectedLabel) {
          correct++;
        }
      }

      if (classification.source === LABEL_SOURCES.FALLBACK) {
        fallbackCount++;
      }

      console.log(
        `[Seed] ${i + 1}/${emails.length} | ` +
        `${conversation.subject.slice(0, 40)} | ` +
        `Predicted: ${classification.label} | ` +
        `Expected: ${expectedLabel || 'N/A'}`
      );

    } catch (error) {
      failed++;

      console.error(
        `[Seed] Failed ${i + 1}/${emails.length}:`,
        error.message
      );
    }

    if (i < emails.length - 1) {
      await wait(DELAY_MS);
    }
  }

  const accuracy = compared
    ? ((correct / compared) * 100).toFixed(2)
    : 'N/A';

  console.log('\n========== SEED REPORT ==========');
  console.log(`Total conversations : ${emails.length}`);
  console.log(`Compared            : ${compared}`);
  console.log(`Correct predictions : ${correct}`);
  console.log(`Accuracy            : ${accuracy}%`);
  console.log(`Fallback results    : ${fallbackCount}`);
  console.log(`Activities created  : ${activityCount}`);
  console.log(`Failed              : ${failed}`);
  console.log('=================================\n');
};

// Main seed function
const seed = async () => {
  try {
    console.log('\n[Seed] Connecting to MongoDB...');

    await connectDB();

    console.log('[Seed] Database connected.');

    const owner = await seedOwner();

    const accountMap = await seedAccounts(owner._id);

    const assistants = getAssistantsData();

    await seedConversations(
      owner,
      accountMap,
      assistants
    );

    console.log('[Seed] Completed successfully.');

  } catch (error) {
    console.error('\n[Seed] Failed:', error);

    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();

    console.log('[Seed] Database connection closed.');
  }
};

seed();