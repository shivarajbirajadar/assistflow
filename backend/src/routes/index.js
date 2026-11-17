import { Router } from 'express';

import {
    register,
    login,
    getMe
} from '../controllers/auth.controller.js';

import {
    getAccounts,
    connectAccount,
    updateAccount,
    disconnectAccount,
    reconnectAccount,
    deleteAccount
} from '../controllers/account.controller.js';

import {
    getConversations,
    getConversation,
    changeLabel,
    revertLabel,
    toggleStar,
    toggleRead,
    toggleArchive,
    snoozeConversation,
    assignConversation,
    toggleComplete,
    bulkUpdate,
    getTriageQueue
} from '../controllers/conversation.controller.js';

import {
    getSummary,
    getWhyLabel,
    askConversation,
    reclassify,
    createDraft,
    editDraft,
    approveDraft,
    sendDraft
} from '../controllers/ai.controller.js';

import {
    getOverview,
    getRecentActivity,
    getDashboardStats
} from '../controllers/dashboard.controller.js';

import {
    getClientInbox,
    markHandled,
    assistantTakeOver
} from '../controllers/clientView.controller.js';

import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getLearnedRules,
    createLearnedRule,
    deleteLearnedRule,
    simulateNewEmail
} from '../controllers/extras.controller.js';

import {
    protect,
    attachActor,
    requireActor,
    aiLimiter
} from '../core/middleware.js';

import { features } from '../config/index.js';

const router = Router();

// ---------- AUTH ----------
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', protect, getMe);

// ---------- PROTECTED ROUTES ----------
router.use(protect);
router.use(attachActor);

// ---------- ACCOUNTS ----------
router.get('/accounts', getAccounts);
router.post('/accounts', connectAccount);
router.patch('/accounts/:id', updateAccount);
router.post('/accounts/:id/reconnect', reconnectAccount);
router.post('/accounts/:id/disconnect', disconnectAccount);
router.delete('/accounts/:id', deleteAccount);

// ---------- CONVERSATIONS ----------
router.get('/conversations', getConversations);
router.get('/conversations/triage', getTriageQueue);
router.get('/conversations/:id', getConversation);

router.patch('/conversations/:id/label', changeLabel);
router.post('/conversations/:id/label/revert', revertLabel);

router.patch('/conversations/:id/star', toggleStar);
router.patch('/conversations/:id/read', toggleRead);
router.patch('/conversations/:id/archive', toggleArchive);
router.patch('/conversations/:id/snooze', snoozeConversation);
router.patch('/conversations/:id/assign', assignConversation);
router.patch('/conversations/:id/complete', toggleComplete);

router.post('/conversations/bulk', bulkUpdate);

// ---------- AI ----------
router.get(
    '/conversations/:id/summary',
    aiLimiter,
    getSummary
);

router.get(
    '/conversations/:id/why-label',
    aiLimiter,
    getWhyLabel
);

router.post(
    '/conversations/:id/ask',
    aiLimiter,
    askConversation
);

router.post(
    '/conversations/:id/reclassify',
    aiLimiter,
    reclassify
);

router.post(
    '/conversations/:id/drafts',
    aiLimiter,
    createDraft
);

router.patch(
    '/conversations/:id/drafts/:draftId',
    editDraft
);

router.post(
    '/conversations/:id/drafts/:draftId/approve',
    approveDraft
);

router.post(
    '/conversations/:id/drafts/:draftId/send',
    sendDraft
);

// ---------- DASHBOARD ----------
router.get('/dashboard/overview', getOverview);
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/activity', getRecentActivity);

// ---------- CLIENT VIEW ----------
router.get('/client/inbox', getClientInbox);
router.post('/client/conversations/:id/handled', markHandled);
router.post('/client/conversations/:id/takeover', assistantTakeOver);

// ---------- NOTIFICATIONS ----------
if (features.notifications) {
    router.get('/notifications', getNotifications);
    router.patch('/notifications/:id/read', markNotificationRead);
    router.patch('/notifications/read-all', markAllNotificationsRead);
}

// ---------- LEARNED RULES ----------
if (features.rules) {
    router.get('/rules', getLearnedRules);
    router.post('/rules', createLearnedRule);
    router.delete('/rules/:id', deleteLearnedRule);
}

// ---------- SIMULATE INCOMING ----------
if (features.simulate) {
    router.post('/simulate/incoming', simulateNewEmail);
}

export default router;