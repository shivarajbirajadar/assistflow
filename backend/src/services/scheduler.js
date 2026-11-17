import cron from 'node-cron';

import Conversation from '../models/Conversation.js';
import { LABELS, LABEL_SOURCES, features } from '../config/index.js';
import { logActivity } from '../core/events.js';

let schedulerTask = null;

// Return conversations whose snooze time has expired
const processExpiredSnoozes = async () => {
  if (!features.snooze) return;

  const now = new Date();

  const conversations = await Conversation.find({
    snoozedUntil: { $ne: null, $lte: now },
  });

  for (const conversation of conversations) {
    conversation.snoozedUntil = null;

    await conversation.save();

    logActivity({
      ownerId: conversation.ownerId,
      conversationId: conversation._id,
      accountId: conversation.accountId,

      actor: {
        type: 'system',
        id: 'SYSTEM',
        name: 'Scheduler',
      },

      action: 'unsnoozed',
      note: 'Snooze period expired. Conversation returned to inbox.',
    });
  }

  if (conversations.length > 0) {
    console.log(
      `[Scheduler] ${conversations.length} snoozed conversations returned to inbox.`
    );
  }
};

// Flag conversations that have been waiting for too long
const processAgingConversations = async () => {
  const cutoff = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  );

  const conversations = await Conversation.find({
    lastMessageDirection: 'in',
    lastIncomingAt: { $lte: cutoff },
    label: { $ne: LABELS.REVIEW },
    lockedByUser: { $ne: true },
    ownerStatus: 'pending',
    isArchived: { $ne: true },
    isCompleted: { $ne: true },
  });

  for (const conversation of conversations) {
    conversation.needsReview = true;

    await conversation.save();
  }

  if (conversations.length > 0) {
    console.log(
      `[Scheduler] ${conversations.length} aging conversations flagged for review.`
    );
  }
};

// Run all scheduled maintenance tasks
const runScheduledTasks = async () => {
  try {
    await processExpiredSnoozes();
    await processAgingConversations();
  } catch (error) {
    console.error('[Scheduler] Task failed:', error.message);
  }
};

// Start scheduler
export const startScheduler = () => {
  if (schedulerTask) {
    console.log('[Scheduler] Already running.');
    return;
  }

  schedulerTask = cron.schedule('*/5 * * * *', runScheduledTasks);

  console.log('[Scheduler] Started. Tasks run every 5 minutes.');

  // Run once immediately
  runScheduledTasks();
};

// Stop scheduler
export const stopScheduler = () => {
  if (!schedulerTask) return;

  schedulerTask.stop();
  schedulerTask = null;

  console.log('[Scheduler] Stopped.');
};