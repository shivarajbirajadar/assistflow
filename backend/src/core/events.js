import { EventEmitter } from 'node:events';
import { features } from '../config/index.js';
import ActivityLog from '../models/ActivityLog.js';
import Notification from '../models/Notification.js';

export const EVENTS = {
  ACTIVITY: 'activity.log',
  MESSAGE_RECEIVED: 'message.received',
  AI_SUGGESTS_CHANGE: 'ai.suggests_change',
  OWNER_ACTION: 'owner.action',
  DRAFT_SENT: 'draft.sent',
};

export const events = new EventEmitter();
events.setMaxListeners(30);

export const emit = (name, payload) => events.emit(name, payload);

/**
 * payload: { ownerId, conversationId, accountId,
 *            actor: { type, id, name }, action, from, to, note }
 */
export const logActivity = (payload) => events.emit(EVENTS.ACTIVITY, payload);

const safe = (fn) => async (payload) => {
  try {
    await fn(payload);
  } catch (err) {
    console.error('[events] listener failed:', err.message);
  }
};

let registered = false;

export function registerListeners() {
  if (registered) return;
  registered = true;

  // Audit trail (who did what)
  events.on(
    EVENTS.ACTIVITY,
    safe(async (payload) => {
      await ActivityLog.create(payload);
    })
  );

  if (!features.notifications) return;

  // New or updated email
  events.on(
    EVENTS.MESSAGE_RECEIVED,
    safe(async ({ ownerId, conversationId, subject, label }) => {
      if (label === 'client_reply') {
        await Notification.create({
          ownerId,
          conversationId,
          audience: 'owner',
          type: 'client_reply_needed',
          title: 'Your reply is needed',
          body: subject,
        });
      } else if (label === 'assistant_reply') {
        await Notification.create({
          ownerId,
          conversationId,
          audience: 'assistants',
          type: 'assistant_reply_needed',
          title: 'New email to handle',
          body: subject,
        });
      }
    })
  );

  // AI disagrees with a label the assistant locked
  events.on(
    EVENTS.AI_SUGGESTS_CHANGE,
    safe(async ({ ownerId, conversationId, subject, suggestedLabel }) => {
      await Notification.create({
        ownerId,
        conversationId,
        audience: 'assistants',
        type: 'ai_suggests_change',
        title: 'AI suggests a different label',
        body: `${subject} (suggested: ${suggestedLabel})`,
      });
    })
  );

  // Owner marked handled / asked an assistant to take over
  events.on(
    EVENTS.OWNER_ACTION,
    safe(async ({ ownerId, conversationId, subject, action, note }) => {
      const handled = action === 'owner_handled';
      await Notification.create({
        ownerId,
        conversationId,
        audience: 'assistants',
        type: action,
        title: handled ? 'Owner marked this as handled' : 'Owner asked an assistant to take over',
        body: note ? `${subject}: ${note}` : subject,
      });
    })
  );

  // Reply sent
  events.on(
    EVENTS.DRAFT_SENT,
    safe(async ({ ownerId, conversationId, subject, actor }) => {
      await Notification.create({
        ownerId,
        conversationId,
        audience: 'owner',
        type: 'reply_sent',
        title: `${actor?.name || 'An assistant'} sent a reply`,
        body: subject,
      });
    })
  );
}