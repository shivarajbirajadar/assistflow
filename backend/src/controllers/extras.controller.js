import Notification from '../models/Notification.js';
import CorrectionRule from '../models/CorrectionRule.js';
import Conversation from '../models/Conversation.js';

import { LABELS } from '../config/index.js';

import {
    ApiError,
    asyncHandler,
    sendSuccess
} from '../core/helpers.js';

import { simulateIncoming } from '../services/sync.service.js';

// GET NOTIFICATIONS
export const getNotifications = asyncHandler(async (req, res) => {
    const ownerId = req.user._id;

    const limit = Math.min(
        Math.max(Number(req.query.limit) || 20, 1),
        100
    );

    const [notifications, unreadCount] = await Promise.all([
        Notification.find({ ownerId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean(),

        Notification.countDocuments({
            ownerId,
            isRead: false
        })
    ]);

    return sendSuccess(res, {
        notifications,
        unreadCount
    });
});

// MARK NOTIFICATION AS READ
export const markNotificationRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        {
            _id: req.params.id,
            ownerId: req.user._id
        },
        {
            $set: { isRead: true }
        },
        {
            new: true
        }
    );

    if (!notification) {
        throw new ApiError(404, 'Notification not found');
    }

    return sendSuccess(res, notification);
});

// MARK ALL NOTIFICATIONS AS READ
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
        {
            ownerId: req.user._id,
            isRead: false
        },
        {
            $set: { isRead: true }
        }
    );

    return sendSuccess(res, {
        modifiedCount: result.modifiedCount
    });
});

// GET LEARNED RULES
export const getLearnedRules = asyncHandler(async (req, res) => {
    const rules = await CorrectionRule.find({
        ownerId: req.user._id
    })
        .sort({ createdAt: -1 })
        .lean();

    return sendSuccess(res, rules);
});

// CREATE LEARNED RULE
export const createLearnedRule = asyncHandler(async (req, res) => {
    const {
        senderEmail,
        senderDomain,
        forcedLabel,
        note
    } = req.body;

    if (!senderEmail && !senderDomain) {
        throw new ApiError(
            400,
            'Sender email or sender domain is required'
        );
    }

    if (!Object.values(LABELS).includes(forcedLabel)) {
        throw new ApiError(400, 'Invalid classification label');
    }

    const rule = await CorrectionRule.create({
        ownerId: req.user._id,
        senderEmail: senderEmail?.toLowerCase().trim(),
        senderDomain: senderDomain?.toLowerCase().trim(),
        forcedLabel,
        note: note || '',
        createdBy: req.user._id,
        active: true
    });

    return sendSuccess(res, rule, 201);
});

// DELETE LEARNED RULE
export const deleteLearnedRule = asyncHandler(async (req, res) => {
    const rule = await CorrectionRule.findOneAndDelete({
        _id: req.params.id,
        ownerId: req.user._id
    });

    if (!rule) {
        throw new ApiError(404, 'Learned rule not found');
    }

    return sendSuccess(res, {
        message: 'Learned rule deleted successfully'
    });
});

// SIMULATE INCOMING EMAIL
export const simulateNewEmail = asyncHandler(async (req, res) => {
    const ownerId = req.user._id;
    const { seedKey } = req.body;

    if (!seedKey) {
        throw new ApiError(400, 'Seed key is required');
    }

    // Find existing seeded conversation
    const conversation = await Conversation.findOne({
        ownerId,
        seedKey
    });

    if (!conversation) {
        throw new ApiError(404, 'Seed conversation not found');
    }

    // Get latest incoming message
    const incomingMessage = [...conversation.messages]
        .reverse()
        .find(message => message.direction === 'in');

    if (!incomingMessage) {
        throw new ApiError(
            400,
            'No incoming message found in this conversation'
        );
    }

    // Prepare simulated email
    const email = {
        accountId: conversation.accountId,
        seedKey: conversation.seedKey,
        subject: conversation.subject,

        from: {
            name: incomingMessage.from?.name || '',
            email: incomingMessage.from?.email || ''
        },

        to: {
            name: incomingMessage.to?.name || '',
            email: incomingMessage.to?.email || ''
        },

        body: incomingMessage.body,
        cc: incomingMessage.cc || [],
        attachments: incomingMessage.attachments || [],
        isForwarded: incomingMessage.isForwarded,
        sentAt: new Date()
    };

    const result = await simulateIncoming(email, ownerId);

    return sendSuccess(res, result, 201);
});