import Conversation from '../models/Conversation.js';

import {
  LABELS,
  OWNER_STATUS,
  ACTIONS,
  ACTOR_TYPES,
} from '../config/index.js';

import {
  ApiError,
  asyncHandler,
  sendSuccess,
} from '../core/helpers.js';

import {
  logActivity,
  emit,
  EVENTS,
} from '../core/events.js';

// Get conversations that require owner's attention
export const getClientInbox = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;

  const conversations = await Conversation.find({
    ownerId,
    label: LABELS.CLIENT,
    ownerStatus: OWNER_STATUS.PENDING,
    isArchived: { $ne: true },
  })
    .sort({ updatedAt: -1 })
    .populate('accountId', 'address provider label')
    .lean();

  return sendSuccess(res, conversations);
});

// Owner marks conversation as handled
export const markHandled = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;
  const { id } = req.params;
  const { note = '' } = req.body;

  const conversation = await Conversation.findOne({
    _id: id,
    ownerId,
    label: LABELS.CLIENT,
  });

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const previousStatus = conversation.ownerStatus;

  conversation.ownerStatus = OWNER_STATUS.HANDLED;
  conversation.ownerNote = note;
  conversation.ownerActionAt = new Date();

  await conversation.save();

  logActivity({
    ownerId,
    conversationId: conversation._id,
    accountId: conversation.accountId,

    actor: {
      type: ACTOR_TYPES.OWNER,
      id: req.user.actorId || String(req.user._id),
      name: req.user.name,
    },

    action: ACTIONS.OWNER_HANDLED,
    from: previousStatus,
    to: OWNER_STATUS.HANDLED,
    note,
  });

  emit(EVENTS.OWNER_ACTION, {
    ownerId,
    conversationId: conversation._id,
    subject: conversation.subject,
    action: ACTIONS.OWNER_HANDLED,
    note,
  });

  return sendSuccess(res, conversation, 200, {
    message: 'Conversation marked as handled',
  });
});

// Assistant takes over conversation from owner
export const assistantTakeOver = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;
  const { id } = req.params;
  const { note = '' } = req.body;

  const conversation = await Conversation.findOne({
    _id: id,
    ownerId,
    label: LABELS.CLIENT,
  });

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const previousStatus = conversation.ownerStatus;

  conversation.ownerStatus = OWNER_STATUS.TAKEOVER;
  conversation.ownerNote = note;
  conversation.ownerActionAt = new Date();

  await conversation.save();

  logActivity({
    ownerId,
    conversationId: conversation._id,
    accountId: conversation.accountId,

    actor: {
      type: ACTOR_TYPES.ASSISTANT,
      id: req.user.actorId || String(req.user._id),
      name: req.user.name,
    },

    action: ACTIONS.OWNER_TAKEOVER,
    from: previousStatus,
    to: OWNER_STATUS.TAKEOVER,
    note,
  });

  emit(EVENTS.OWNER_ACTION, {
    ownerId,
    conversationId: conversation._id,
    subject: conversation.subject,
    action: ACTIONS.OWNER_TAKEOVER,
    note,
  });

  return sendSuccess(res, conversation, 200, {
    message: 'Assistant has taken over this conversation',
  });
});