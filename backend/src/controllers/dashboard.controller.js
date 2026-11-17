import Conversation from '../models/Conversation.js';
import EmailAccount from '../models/EmailAccount.js';
import ActivityLog from '../models/ActivityLog.js';
import Notification from '../models/Notification.js';

import { LABELS } from '../config/index.js';
import { asyncHandler, sendSuccess } from '../core/helpers.js';

// Dashboard overview
export const getOverview = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;

  const [
    totalEmails,
    assistantReply,
    clientReply,
    noReply,
    needsReview,
    unread,
    starred,
    accounts,
    recentConversations,
    recentActivity,
    unreadNotifications,
  ] = await Promise.all([
    Conversation.countDocuments({ ownerId }),

    Conversation.countDocuments({
      ownerId,
      label: LABELS.ASSISTANT,
    }),

    Conversation.countDocuments({
      ownerId,
      label: LABELS.CLIENT,
    }),

    Conversation.countDocuments({
      ownerId,
      label: LABELS.NONE,
    }),

    Conversation.countDocuments({
      ownerId,
      label: LABELS.REVIEW,
    }),

    Conversation.countDocuments({
      ownerId,
      isUnread: true,
    }),

    Conversation.countDocuments({
      ownerId,
      isStarred: true,
    }),

    EmailAccount.find({ ownerId }).lean(),

    Conversation.find({
      ownerId,
      isArchived: false,
    })
      .sort({ lastMessageAt: -1 })
      .limit(10)
      .populate('accountId', 'address provider label')
      .lean(),

    ActivityLog.find({ ownerId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('conversationId', 'subject')
      .lean(),

    Notification.countDocuments({
      ownerId,
      isRead: false,
    }),
  ]);

  const connectedAccounts = accounts.filter(
    (account) => account.status === 'connected'
  );

  return sendSuccess(res, {
    stats: {
      totalEmails,
      assistantReply,
      clientReply,
      noReply,
      needsReview,
      unread,
      starred,
    },

    accounts: {
      total: accounts.length,
      connected: connectedAccounts.length,
      list: accounts,
    },

    recentConversations,
    recentActivity,
    unreadNotifications,
  });
});

// Recent activity
export const getRecentActivity = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;

  const limit = Math.min(
    Math.max(Number(req.query.limit) || 10, 1),
    50
  );

  const activities = await ActivityLog.find({ ownerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('conversationId', 'subject')
    .lean();

  return sendSuccess(res, activities);
});

// Dashboard statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;

  const [
    total,
    assistantReply,
    clientReply,
    noReply,
    needsReview,
    unread,
    archived,
  ] = await Promise.all([
    Conversation.countDocuments({ ownerId }),

    Conversation.countDocuments({
      ownerId,
      label: LABELS.ASSISTANT,
    }),

    Conversation.countDocuments({
      ownerId,
      label: LABELS.CLIENT,
    }),

    Conversation.countDocuments({
      ownerId,
      label: LABELS.NONE,
    }),

    Conversation.countDocuments({
      ownerId,
      label: LABELS.REVIEW,
    }),

    Conversation.countDocuments({
      ownerId,
      isUnread: true,
    }),

    Conversation.countDocuments({
      ownerId,
      isArchived: true,
    }),
  ]);

  return sendSuccess(res, {
    total,
    assistantReply,
    clientReply,
    noReply,
    needsReview,
    unread,
    archived,
  });
});