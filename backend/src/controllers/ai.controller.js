
import Conversation from '../models/Conversation.js';
import {
  LABELS,
  LABEL_SOURCES,
  DRAFT_STATUS,
  ACTIONS,
} from '../config/index.js';

import {
  ApiError,
  asyncHandler,
  sendSuccess,
} from '../core/helpers.js';

import { logActivity, emit, EVENTS } from '../core/events.js';

import {
  generateSummary,
  answerConversationQuestion,
  reclassifyConversation,
  generateReplyDraft,
} from '../services/ai.service.js';

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

const recordActivity = (req, conversation, action, from = '', to = '') => {
  logActivity({
    ownerId: req.user._id,
    conversationId: conversation._id,
    accountId: conversation.accountId,
    actor: getActor(req),
    action,
    from: String(from),
    to: String(to),
  });
};

// ---------- Generate AI Summary ----------

export const getSummary = asyncHandler(async (req, res) => {
  const conversation = await findConversation(req);

  const fallbackText =
    'Unable to generate an AI summary. Please review the email conversation.';

  // Do not reuse previously failed summaries.
  const hasValidCachedSummary =
    conversation.summary?.text &&
    conversation.summary.text !== fallbackText &&
    conversation.summary.messageCount === conversation.messages.length;

  if (hasValidCachedSummary) {
    return sendSuccess(res, {
      summary: conversation.summary,
      cached: true,
    });
  }

  const summary = await generateSummary(conversation);

  const summaryData = {
    text: summary.text,
    keyPoints: summary.keyPoints || [],
    dates: summary.dates || [],
    generatedAt: new Date(),
    messageCount: conversation.messages.length,
  };

  // Never permanently cache a failed AI summary.
  if (summary.fallback) {
    return sendSuccess(res, {
      summary: summaryData,
      cached: false,
      fallback: true,
    });
  }

  conversation.summary = summaryData;

  await conversation.save();

  return sendSuccess(res, {
    summary: conversation.summary,
    cached: false,
    fallback: false,
  });
});

// ---------- Why This Label? ----------

export const getWhyLabel = asyncHandler(async (req, res) => {
  const conversation = await findConversation(req);

  sendSuccess(res, {
    label: conversation.label,
    aiLabel: conversation.aiLabel,
    reason: conversation.reason,
    confidence: conversation.confidence,
    labelSource: conversation.labelSource,
    needsReview: conversation.needsReview,
    lockedByUser: conversation.lockedByUser,
    aiSuggestion: conversation.aiSuggestion,
  });
});

// ---------- Ask AI About a Conversation ----------
// Existing implementation intentionally unchanged.

export const askConversation = asyncHandler(async (req, res) => {
  const { question } = req.body;

  if (!question?.trim()) {
    throw new ApiError(400, 'Please enter a question');
  }

  if (question.length > 2000) {
    throw new ApiError(400, 'Question is too long');
  }

  const conversation = await findConversation(req);

  const answer = await answerConversationQuestion(
    conversation,
    question.trim()
  );

  sendSuccess(res, {
    question,
    answer: answer.text,
    references: answer.references || [],
    fallback: Boolean(answer.fallback),
  });
});

// ---------- Reclassify Conversation ----------

export const reclassify = asyncHandler(async (req, res) => {
  const conversation = await findConversation(req);

  const result = await reclassifyConversation(conversation);

  const previousLabel = conversation.label;

  conversation.aiLabel = result.label;
  conversation.confidence = result.confidence;
  conversation.reason = result.reason;
  conversation.classifiedAt = new Date();

  if (conversation.lockedByUser) {
    conversation.aiSuggestion = {
      label: result.label,
      reason: result.reason,
      confidence: result.confidence,
      at: new Date(),
    };

    if (result.label !== conversation.label) {
      emit(EVENTS.AI_SUGGESTS_CHANGE, {
        ownerId: req.user._id,
        conversationId: conversation._id,
        subject: conversation.subject,
        suggestedLabel: result.label,
      });
    }
  } else {
    conversation.label = result.label;
    conversation.labelSource = result.source || LABEL_SOURCES.AI;
    conversation.needsReview = result.label === LABELS.REVIEW;
  }

  await conversation.save();

  recordActivity(
    req,
    conversation,
    ACTIONS.AI_CLASSIFIED,
    previousLabel,
    result.label
  );

  sendSuccess(res, {
    conversation,
    aiResult: result,
  });
});

// ---------- Generate Reply Draft ----------

export const createDraft = asyncHandler(async (req, res) => {
  const conversation = await findConversation(req);

  const { instructions } = req.body;

  const result = await generateReplyDraft(
    conversation,
    instructions || ''
  );

  conversation.drafts.push({
    body: result.body,
    status: DRAFT_STATUS.DRAFT,
    generatedBy: 'ai',
    createdBy: getActor(req),
    basedOnOwnerNote: Boolean(conversation.ownerNote),
  });

  const draft = conversation.drafts[conversation.drafts.length - 1];

  await conversation.save();

  recordActivity(
    req,
    conversation,
    ACTIONS.DRAFT_CREATED,
    '',
    draft._id
  );

  sendSuccess(res, {
    draft,
  }, 201);
});

// ---------- Edit Draft ----------

export const editDraft = asyncHandler(async (req, res) => {
  const { body } = req.body;

  if (!body?.trim()) {
    throw new ApiError(400, 'Draft body cannot be empty');
  }

  const conversation = await findConversation(req);

  const draft = conversation.drafts.id(req.params.draftId);

  if (!draft) {
    throw new ApiError(404, 'Draft not found');
  }

  if (draft.status !== DRAFT_STATUS.DRAFT) {
    throw new ApiError(400, 'Only pending drafts can be edited');
  }

  draft.body = body.trim();
  draft.generatedBy = 'manual';

  await conversation.save();

  sendSuccess(res, {
    draft,
  });
});

// ---------- Approve Draft ----------

export const approveDraft = asyncHandler(async (req, res) => {
  const conversation = await findConversation(req);

  const draft = conversation.drafts.id(req.params.draftId);

  if (!draft) {
    throw new ApiError(404, 'Draft not found');
  }

  if (draft.status !== DRAFT_STATUS.DRAFT) {
    throw new ApiError(400, 'This draft cannot be approved');
  }

  draft.status = DRAFT_STATUS.APPROVED;
  draft.approvedBy = getActor(req);
  draft.approvedAt = new Date();

  await conversation.save();

  recordActivity(
    req,
    conversation,
    ACTIONS.DRAFT_APPROVED,
    DRAFT_STATUS.DRAFT,
    DRAFT_STATUS.APPROVED
  );

  sendSuccess(res, {
    draft,
  });
});

// ---------- Send Approved Draft ----------

export const sendDraft = asyncHandler(async (req, res) => {
  const conversation = await findConversation(req);

  const draft = conversation.drafts.id(req.params.draftId);

  if (!draft) {
    throw new ApiError(404, 'Draft not found');
  }

  if (draft.status !== DRAFT_STATUS.APPROVED) {
    throw new ApiError(
      403,
      'Draft must be approved before sending'
    );
  }

  const actor = getActor(req);

  const lastIncoming = [...conversation.messages]
    .reverse()
    .find((message) => message.direction === 'in');

  if (!lastIncoming) {
    throw new ApiError(400, 'No incoming message found');
  }

  // Demo mode: no real email is sent.
  conversation.messages.push({
    direction: 'out',
    from: {
      name: req.user.name,
      email: req.user.email,
    },
    to: lastIncoming.from,
    body: draft.body,
    sentAt: new Date(),
    sentBy: {
      id: actor.id,
      name: actor.name,
    },
  });

  draft.status = DRAFT_STATUS.SENT;
  draft.sentAt = new Date();

  conversation.refreshDerived();

  await conversation.save();

  recordActivity(
    req,
    conversation,
    ACTIONS.REPLY_SENT,
    '',
    actor.name
  );

  emit(EVENTS.DRAFT_SENT, {
    ownerId: req.user._id,
    conversationId: conversation._id,
    subject: conversation.subject,
    actor,
  });

  sendSuccess(res, {
    message: 'Reply sent successfully (demo mode)',
    conversation,
    draft,
  });
});
