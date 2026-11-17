import Conversation from '../models/Conversation.js';
import { LABELS, LABEL_SOURCES, ACTIONS, features } from '../config/index.js';
import {
  ApiError,
  asyncHandler,
  sendSuccess,
  parsePagination,
  escapeRegex,
} from '../core/helpers.js';
import { logActivity } from '../core/events.js';

// ---------- Common Helpers ----------

const getActor = (req) => ({
  type: req.actor?.type || 'owner',
  id: req.actor?.id || req.user.actorId,
  name: req.actor?.name || req.user.name,
});

const findConversation = async (req) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    ownerId: req.user._id,
  });

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  return conversation;
};

const recordActivity = (req, conversation, action, from, to, note) => {
  logActivity({
    ownerId: req.user._id,
    conversationId: conversation._id,
    accountId: conversation.accountId,
    actor: getActor(req),
    action,
    from: from === undefined ? '' : String(from),
    to: to === undefined ? '' : String(to),
    note,
  });
};

// ---------- List Conversations ----------

export const getConversations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const filter = {
    ownerId: req.user._id,
  };

  const andConditions = [];

  // Account filter
  if (req.query.accountId) {
    filter.accountId = req.query.accountId;
  }

  // Label filter
  if (req.query.label && req.query.label !== 'all') {
    filter.label = req.query.label;
  }

  // Search filter
  if (req.query.search?.trim()) {
    const search = escapeRegex(req.query.search.trim());

    andConditions.push({
      $or: [
        { subject: { $regex: search, $options: 'i' } },
        { fromName: { $regex: search, $options: 'i' } },
        { fromEmail: { $regex: search, $options: 'i' } },
        { snippet: { $regex: search, $options: 'i' } },
      ],
    });
  }

  // Unread filter
  if (req.query.unread === 'true') {
    filter.isUnread = true;
  }

  // Important filter
  if (req.query.important === 'true') {
    andConditions.push({
      $or: [
        { isStarred: true },
        { tags: 'important' },
      ],
    });
  }

  // Archive filter
  if (req.query.archived === 'true') {
    filter.isArchived = true;
  } else {
    filter.isArchived = false;
  }

  // Completed filter
  if (req.query.completed === 'true') {
    filter.isCompleted = true;
  }

  // Assigned to current actor
  if (req.query.assignedToMe === 'true' && req.actor) {
    filter['assignedTo.id'] = req.actor.id;
  }

  // Client attention
  if (req.query.clientAttention === 'true') {
    filter.label = LABELS.CLIENT;
    filter.ownerStatus = 'pending';
  }

  // Waiting conversations
  if (req.query.waiting === 'true') {
    filter.tags = 'waiting_for_response';
  }

  // Needs review queue
  if (req.query.triage === 'true') {
    andConditions.push({
      $or: [
        { label: LABELS.REVIEW },
        { needsReview: true },
      ],
    });
  }

  // Combine all OR conditions without overwriting each other
  if (andConditions.length > 0) {
    filter.$and = andConditions;
  }

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .populate('accountId', 'provider address label status')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Conversation.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    { conversations },
    200,
    {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  );
});

// ---------- Get Single Conversation ----------

export const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    ownerId: req.user._id,
  }).populate('accountId', 'provider address label status');

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  sendSuccess(res, { conversation });
});

// ---------- Change Label ----------

export const changeLabel = asyncHandler(async (req, res) => {
  const { label } = req.body;

  if (!Object.values(LABELS).includes(label)) {
    throw new ApiError(400, 'Invalid conversation label');
  }

  const conversation = await findConversation(req);

  const previousLabel = conversation.label;

  conversation.label = label;
  conversation.labelSource = LABEL_SOURCES.ASSISTANT;
  conversation.lockedByUser = true;
  conversation.needsReview = label === LABELS.REVIEW;

  await conversation.save();

  recordActivity(
    req,
    conversation,
    ACTIONS.LABEL_CHANGED,
    previousLabel,
    label
  );

  sendSuccess(res, { conversation });
});

// ---------- Revert Label to AI Classification ----------

export const revertLabel = asyncHandler(async (req, res) => {
  const conversation = await findConversation(req);

  if (!conversation.aiLabel) {
    throw new ApiError(400, 'No AI classification available to restore');
  }

  const previousLabel = conversation.label;

  conversation.label = conversation.aiLabel;
  conversation.labelSource = LABEL_SOURCES.AI;
  conversation.lockedByUser = false;
  conversation.needsReview = conversation.aiLabel === LABELS.REVIEW;

  await conversation.save();

  recordActivity(
    req,
    conversation,
    ACTIONS.LABEL_REVERTED,
    previousLabel,
    conversation.label
  );

  sendSuccess(res, { conversation });
});

// ---------- Star / Unstar Conversation ----------

export const toggleStar = asyncHandler(async (req, res) => {
  const conversation = await findConversation(req);

  const previousValue = conversation.isStarred;

  conversation.isStarred = !previousValue;

  await conversation.save();

  recordActivity(
    req,
    conversation,
    conversation.isStarred ? ACTIONS.STARRED : ACTIONS.UNSTARRED,
    previousValue,
    conversation.isStarred
  );

  sendSuccess(res, { conversation });
});

// ---------- Mark Read / Unread ----------

export const toggleRead = asyncHandler(async (req, res) => {
  const conversation = await findConversation(req);

  const previousValue = conversation.isUnread;

  conversation.isUnread = !previousValue;

  await conversation.save();

  recordActivity(
    req,
    conversation,
    conversation.isUnread ? ACTIONS.MARKED_UNREAD : ACTIONS.MARKED_READ,
    previousValue,
    conversation.isUnread
  );

  sendSuccess(res, { conversation });
});

// ---------- Archive / Unarchive ----------

export const toggleArchive = asyncHandler(async (req, res) => {
  const conversation = await findConversation(req);

  const previousValue = conversation.isArchived;

  conversation.isArchived = !previousValue;
  conversation.archivedAt = conversation.isArchived ? new Date() : undefined;

  await conversation.save();

  recordActivity(
    req,
    conversation,
    conversation.isArchived ? ACTIONS.ARCHIVED : ACTIONS.UNARCHIVED,
    previousValue,
    conversation.isArchived
  );

  sendSuccess(res, { conversation });
});

// ---------- Snooze Conversation ----------

export const snoozeConversation = asyncHandler(async (req, res) => {
  if (!features.snooze) {
    throw new ApiError(403, 'Snooze feature is disabled');
  }

  const { until } = req.body;

  if (!until || Number.isNaN(new Date(until).getTime())) {
    throw new ApiError(400, 'A valid snooze date is required');
  }

  const snoozeDate = new Date(until);

  if (snoozeDate <= new Date()) {
    throw new ApiError(400, 'Snooze date must be in the future');
  }

  const conversation = await findConversation(req);

  conversation.snoozedUntil = snoozeDate;

  await conversation.save();

  recordActivity(
    req,
    conversation,
    ACTIONS.SNOOZED,
    '',
    snoozeDate.toISOString()
  );

  sendSuccess(res, { conversation });
});

// ---------- Assign Conversation ----------

export const assignConversation = asyncHandler(async (req, res) => {
  const { assistantId } = req.body;

  const conversation = await findConversation(req);

  let assignedTo = null;

  if (assistantId) {
    const assistant = req.user.assistants.find(
      (item) => item.assistantId === assistantId.trim().toUpperCase()
    );

    if (!assistant) {
      throw new ApiError(400, 'Invalid assistant ID');
    }

    assignedTo = {
      id: assistant.assistantId,
      name: assistant.name,
    };
  }

  const previousAssignment = conversation.assignedTo
    ? `${conversation.assignedTo.name} (${conversation.assignedTo.id})`
    : '';

  conversation.assignedTo = assignedTo;

  await conversation.save();

  recordActivity(
    req,
    conversation,
    ACTIONS.ASSIGNED,
    previousAssignment,
    assignedTo ? `${assignedTo.name} (${assignedTo.id})` : 'Unassigned'
  );

  sendSuccess(res, { conversation });
});

// ---------- Mark Complete / Reopen ----------

export const toggleComplete = asyncHandler(async (req, res) => {
  const conversation = await findConversation(req);

  const previousValue = conversation.isCompleted;

  conversation.isCompleted = !previousValue;
  conversation.completedAt = conversation.isCompleted ? new Date() : undefined;
  conversation.completedBy = conversation.isCompleted
    ? {
        id: getActor(req).id,
        name: getActor(req).name,
      }
    : undefined;

  await conversation.save();

  recordActivity(
    req,
    conversation,
    conversation.isCompleted ? ACTIONS.COMPLETED : ACTIONS.REOPENED,
    previousValue,
    conversation.isCompleted
  );

  sendSuccess(res, { conversation });
});

// ---------- Bulk Actions ----------

export const bulkUpdate = asyncHandler(async (req, res) => {
  if (!features.bulkActions) {
    throw new ApiError(403, 'Bulk actions are disabled');
  }

  const { ids, action, value } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'Conversation IDs are required');
  }

  if (ids.length > 100) {
    throw new ApiError(400, 'Maximum 100 conversations allowed');
  }

  const conversations = await Conversation.find({
    _id: { $in: ids },
    ownerId: req.user._id,
  });

  if (conversations.length !== ids.length) {
    throw new ApiError(404, 'One or more conversations were not found');
  }

  const updates = {
    archive: { isArchived: true, archivedAt: new Date() },
    unarchive: { isArchived: false, archivedAt: undefined },
    read: { isUnread: false },
    unread: { isUnread: true },
    complete: {
      isCompleted: true,
      completedAt: new Date(),
      completedBy: {
        id: getActor(req).id,
        name: getActor(req).name,
      },
    },
  };

  if (action === 'label') {
    if (!Object.values(LABELS).includes(value)) {
      throw new ApiError(400, 'Invalid conversation label');
    }

    updates.label = {
      label: value,
      labelSource: LABEL_SOURCES.ASSISTANT,
      lockedByUser: true,
      needsReview: value === LABELS.REVIEW,
    };
  }

  const update = updates[action];

  if (!update) {
    throw new ApiError(400, 'Invalid bulk action');
  }

  await Conversation.updateMany(
    {
      _id: { $in: ids },
      ownerId: req.user._id,
    },
    { $set: update }
  );

  sendSuccess(res, {
    updated: conversations.length,
    action,
  });
});

// ---------- Triage Queue ----------

export const getTriageQueue = asyncHandler(async (req, res) => {
  if (!features.triage) {
    throw new ApiError(403, 'Triage feature is disabled');
  }

  const { page, limit, skip } = parsePagination(req.query);

  const filter = {
    ownerId: req.user._id,
    isArchived: false,
    $or: [
      { label: LABELS.REVIEW },
      { needsReview: true },
    ],
  };

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .populate('accountId', 'provider address label')
      .sort({ confidence: 1, lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Conversation.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    { conversations },
    200,
    {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  );
});