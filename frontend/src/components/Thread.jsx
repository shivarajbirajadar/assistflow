import {
  formatDateTime,
  getInitials,
  getSenderName,
} from '../utils.js';

import { EmptyState, Spinner } from '../ui/Feedback.jsx';

function getMessages(conversation, messages) {
  if (Array.isArray(messages)) return messages;

  if (Array.isArray(conversation?.messages)) {
    return conversation.messages;
  }

  if (Array.isArray(conversation?.thread)) {
    return conversation.thread;
  }

  return [];
}

function getSenderEmail(message) {
  return (
    message?.from?.email ||
    message?.sender?.email ||
    message?.email ||
    ''
  );
}

function getMessageBody(message) {
  const body = message?.body;

  if (typeof body === 'string') return body;

  if (body && typeof body === 'object') {
    return (
      body.text ||
      body.content ||
      body.plainText ||
      ''
    );
  }

  return (
    message?.text ||
    message?.content ||
    message?.snippet ||
    message?.preview ||
    ''
  );
}

function getMessageDate(message) {
  return (
    message?.receivedAt ||
    message?.sentAt ||
    message?.date ||
    message?.createdAt ||
    message?.timestamp
  );
}

function Thread({
  conversation = null,
  messages,
  loading = false,
}) {
  const threadMessages = getMessages(conversation, messages);

  const subject =
    conversation?.subject ||
    conversation?.latestMessage?.subject ||
    'No subject';

  if (loading) {
    return (
      <div className="thread-loading">
        <Spinner />
      </div>
    );
  }

  if (threadMessages.length === 0) {
    return (
      <EmptyState
        title="No messages"
        description="Messages in this conversation will appear here."
      />
    );
  }

  return (
    <div className="email-thread">
      <div className="email-thread-header">
        <h2 className="email-thread-subject">
          {subject}
        </h2>

        <span className="email-thread-count">
          {threadMessages.length}{' '}
          {threadMessages.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      <div className="email-thread-messages">
        {threadMessages.map((message, index) => {
          const sender =
            getSenderName(message) ||
            message?.senderName ||
            'Unknown sender';

          const senderEmail = getSenderEmail(message);
          const body = getMessageBody(message);
          const date = getMessageDate(message);

          const messageId =
            message?._id ||
            message?.id ||
            `${index}`;

          return (
            <article
              className="email-thread-message"
              key={messageId}
            >
              <div className="email-thread-message-header">
                <div className="email-thread-sender">
                  <div className="email-thread-avatar">
                    {getInitials(sender)}
                  </div>

                  <div className="email-thread-sender-info">
                    <span className="email-thread-sender-name">
                      {sender}
                    </span>

                    {senderEmail && (
                      <span className="email-thread-sender-email">
                        {senderEmail}
                      </span>
                    )}
                  </div>
                </div>

                {date && (
                  <time className="email-thread-date">
                    {formatDateTime(date)}
                  </time>
                )}
              </div>

              <div className="email-thread-body">
                {body || 'No message content available.'}
              </div>

              {Array.isArray(message?.attachments) &&
                message.attachments.length > 0 && (
                  <div className="email-thread-attachments">
                    <span className="email-thread-attachments-label">
                      Attachments
                    </span>

                    {message.attachments.map((attachment, attachmentIndex) => {
                      const attachmentName =
                        attachment?.filename ||
                        attachment?.name ||
                        `Attachment ${attachmentIndex + 1}`;

                      return (
                        <div
                          className="email-thread-attachment"
                          key={
                            attachment?._id ||
                            attachment?.id ||
                            attachmentIndex
                          }
                        >
                          {attachmentName}
                        </div>
                      );
                    })}
                  </div>
                )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default Thread;