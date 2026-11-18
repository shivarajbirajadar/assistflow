import mongoose from 'mongoose';

import User from '../models/User.js';
import EmailAccount from '../models/EmailAccount.js';
import Conversation from '../models/Conversation.js';
import ActivityLog from '../models/ActivityLog.js';

const DEMO_OWNER_EMAIL = 'rohan@humanityfounders.demo';

export const cloneDemoDataForUser = async (newUser) => {
  try {
    // 1. Find master demo account
    const demoOwner = await User.findOne({
      email: DEMO_OWNER_EMAIL,
    });

    if (!demoOwner) {
      throw new Error('Master demo account not found');
    }

    // 2. Copy assistants
    newUser.actorId = demoOwner.actorId;
    newUser.assistants = demoOwner.assistants;
    await newUser.save();

    // 3. Fetch demo email accounts
    const sourceAccounts = await EmailAccount.find({
      ownerId: demoOwner._id,
    }).lean();

    if (!sourceAccounts.length) {
      throw new Error('No demo email accounts found');
    }

    const accountMap = new Map();

    const newAccounts = await EmailAccount.insertMany(
      sourceAccounts.map((account) => {
        const { _id, ownerId, __v, ...data } = account;

        return {
          ...data,
          ownerId: newUser._id,
        };
      })
    );

    sourceAccounts.forEach((source, index) => {
      accountMap.set(
        String(source._id),
        newAccounts[index]._id
      );
    });

    // 4. Fetch demo conversations
    const sourceConversations = await Conversation.find({
      ownerId: demoOwner._id,
    })
      .select('+expectedLabel +demo')
      .lean();

    if (!sourceConversations.length) {
      throw new Error('No demo conversations found');
    }

    const conversationMap = new Map();

    const newConversations = sourceConversations.map((conversation) => {
      const {
        _id,
        __v,
        ownerId,
        accountId,
        messages,
        drafts,
        ...data
      } = conversation;

      const newAccountId = accountMap.get(String(accountId));

      if (!newAccountId) {
        throw new Error(
          `Demo email account mapping missing for ${conversation.subject}`
        );
      }

      const newConversationId = new mongoose.Types.ObjectId();

      conversationMap.set(String(_id), newConversationId);

      return {
        ...data,
        _id: newConversationId,
        ownerId: newUser._id,
        accountId: newAccountId,

        messages: messages.map((message) => {
          const { _id, ...messageData } = message;

          return {
            ...messageData,
            sentBy: message.sentBy
              ? {
                  ...message.sentBy,
                  name:
                    message.sentBy.id === demoOwner.actorId
                      ? newUser.name
                      : message.sentBy.name,
                }
              : undefined,
          };
        }),

        drafts: drafts.map((draft) => {
          const { _id, ...draftData } = draft;

          return {
            ...draftData,
          };
        }),

        repliedBy: conversation.repliedBy
          ? {
              ...conversation.repliedBy,
              name:
                conversation.repliedBy.id === demoOwner.actorId
                  ? newUser.name
                  : conversation.repliedBy.name,
            }
          : undefined,
      };
    });

    await Conversation.insertMany(newConversations);

    // 5. Clone activity logs
    const sourceActivities = await ActivityLog.find({
      ownerId: demoOwner._id,
    }).lean();

    if (sourceActivities.length) {
      const newActivities = sourceActivities
        .map((activity) => {
          const {
            _id,
            __v,
            ownerId,
            conversationId,
            accountId,
            ...data
          } = activity;

          const newConversationId = conversationMap.get(
            String(conversationId)
          );

          const newAccountId = accountMap.get(String(accountId));

          if (!newConversationId) return null;

          return {
            ...data,
            ownerId: newUser._id,
            conversationId: newConversationId,
            accountId: newAccountId,

            actor: {
              ...data.actor,
              name:
                data.actor?.id === demoOwner.actorId
                  ? newUser.name
                  : data.actor?.name,
            },
          };
        })
        .filter(Boolean);

      if (newActivities.length) {
        await ActivityLog.insertMany(newActivities);
      }
    }

    console.log(
      `[Demo Clone] Successfully cloned demo data for ${newUser.email}`
    );

    console.log(`Email accounts: ${newAccounts.length}`);
    console.log(`Conversations: ${newConversations.length}`);
    console.log(`Activities: ${sourceActivities.length}`);

  } catch (error) {
    // Clean up partial demo data for this newly registered user
    await Promise.all([
      ActivityLog.deleteMany({ ownerId: newUser._id }),
      Conversation.deleteMany({ ownerId: newUser._id }),
      EmailAccount.deleteMany({ ownerId: newUser._id }),
    ]);

    throw error;
  }
};