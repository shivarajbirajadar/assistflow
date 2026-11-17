import EmailAccount from '../models/EmailAccount.js';
import Conversation from '../models/Conversation.js';
import { PROVIDERS, ACCOUNT_STATUS } from '../config/index.js';
import { ApiError, asyncHandler, sendSuccess } from '../core/helpers.js';
import { logActivity } from '../core/events.js';

// ---------- Get All Email Accounts ----------
export const getAccounts = asyncHandler(async (req, res) => {
  const accounts = await EmailAccount.find({
    ownerId: req.user._id,
  }).sort({ createdAt: 1 });

  sendSuccess(res, { accounts });
});

// ---------- Connect Email Account (Simulated OAuth) ----------
export const connectAccount = asyncHandler(async (req, res) => {
  const { provider, address, label } = req.body;

  if (!provider || !address) {
    throw new ApiError(400, 'Provider and email address are required');
  }

  const normalizedProvider = provider.toLowerCase();
  const normalizedAddress = address.trim().toLowerCase();

  if (!PROVIDERS.includes(normalizedProvider)) {
    throw new ApiError(400, 'Provider must be gmail or outlook');
  }

  const existingAccount = await EmailAccount.findOne({
    ownerId: req.user._id,
    address: normalizedAddress,
  });

  if (existingAccount) {
    throw new ApiError(409, 'This email account is already connected');
  }

  const account = await EmailAccount.create({
    ownerId: req.user._id,
    provider: normalizedProvider,
    address: normalizedAddress,
    label: label?.trim() || normalizedAddress,
    status: ACCOUNT_STATUS.CONNECTED,
  });

  sendSuccess(
    res,
    {
      account,
      message: 'Email account connected successfully (demo mode)',
    },
    201
  );
});

// ---------- Update Account ----------
export const updateAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { label, defaultAssistantId } = req.body;

  const account = await EmailAccount.findOne({
    _id: id,
    ownerId: req.user._id,
  });

  if (!account) {
    throw new ApiError(404, 'Email account not found');
  }

  if (label !== undefined) {
    account.label = label.trim();
  }

  if (defaultAssistantId !== undefined) {
    const assistantId = defaultAssistantId.trim().toUpperCase();

    if (assistantId) {
      const assistantExists = req.user.assistants.some(
        (assistant) => assistant.assistantId === assistantId
      );

      if (!assistantExists) {
        throw new ApiError(400, 'Invalid assistant ID');
      }
    }

    const previousAssistant = account.defaultAssistantId || '';

    account.defaultAssistantId = assistantId || undefined;

    logActivity({
      ownerId: req.user._id,
      accountId: account._id,
      actor: {
        type: req.actor?.type || 'owner',
        id: req.actor?.id || req.user.actorId,
        name: req.actor?.name || req.user.name,
      },
      action: 'account_assigned',
      from: previousAssistant,
      to: assistantId,
    });
  }

  await account.save();

  sendSuccess(res, { account });
});

// ---------- Disconnect Account ----------
export const disconnectAccount = asyncHandler(async (req, res) => {
  const account = await EmailAccount.findOne({
    _id: req.params.id,
    ownerId: req.user._id,
  });

  if (!account) {
    throw new ApiError(404, 'Email account not found');
  }

  account.status = ACCOUNT_STATUS.DISCONNECTED;
  await account.save();

  sendSuccess(res, {
    account,
    message: 'Email account disconnected successfully',
  });
});

// ---------- Reconnect Account (Simulated OAuth) ----------
export const reconnectAccount = asyncHandler(async (req, res) => {
  const account = await EmailAccount.findOne({
    _id: req.params.id,
    ownerId: req.user._id,
  });

  if (!account) {
    throw new ApiError(404, 'Email account not found');
  }

  account.status = ACCOUNT_STATUS.CONNECTED;
  account.lastSyncedAt = new Date();

  await account.save();

  sendSuccess(res, {
    account,
    message: 'Email account reconnected successfully (demo mode)',
  });
});

// ---------- Delete Account ----------
export const deleteAccount = asyncHandler(async (req, res) => {
  const account = await EmailAccount.findOne({
    _id: req.params.id,
    ownerId: req.user._id,
  });

  if (!account) {
    throw new ApiError(404, 'Email account not found');
  }

  const conversationsExist = await Conversation.exists({
    accountId: account._id,
    ownerId: req.user._id,
  });

  if (conversationsExist) {
    throw new ApiError(
      400,
      'Cannot delete an account that contains conversations. Disconnect it instead.'
    );
  }

  await account.deleteOne();

  sendSuccess(res, {
    message: 'Email account deleted successfully',
  });
});