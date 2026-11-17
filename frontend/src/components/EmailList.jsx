import { formatEmailDate, getConversationSubject, getLatestMessage, getSenderName, getInitials } from '../utils.js';
import { ClassificationChip } from '../ui/ClassificationChip.jsx';
import { Spinner, EmptyState } from '../ui/Feedback.jsx';

function getConversationId(conversation) {
  return conversation?._id || conversation?.id || '';
}

function getSenderEmail(conversation, message) {
  return (
    message?.from?.email ||
    message?.sender?.email ||
    conversation?.sender?.email ||
    conversation?.from?.email ||
    ''
  );
}

function getLabel(conversation) {
  return (
    conversation?.label ||
    conversation?.classification ||
    conversation?.aiLabel ||
    'general'
  );
}

function getHandledBy(conversation) {
  const actor = conversation?.handledBy || conversation?.owner;

  if (!actor) return '';

  if (typeof actor === 'string') return actor;

  return actor.name || actor.displayName || actor.id || '';
}

function getRepliedBy(conversation) {
  const actor = conversation?.repliedBy;

  if (!actor) return '';

  if (typeof actor === 'string') return actor;

  return actor.name || actor.displayName || actor.id || '';
}

function EmailList({
  conversations = [],
  selectedId = '',
  onSelect,
  loading = false,
  emptyMessage = 'No emails found.',
}) {
  if (loading) {
    return (
      <div className="email-list-loading">
        <Spinner />
      </div>
    );
  }

  if (!Array.isArray(conversations) || conversations.length === 0) {
    return (
      <EmptyState
        title="No emails"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className="email-list">
      {conversations.map((conversation) => {
        const id = getConversationId(conversation);
        const latestMessage = getLatestMessage(conversation);

        const sender =
          getSenderName(latestMessage) ||
          conversation?.sender?.name ||
          conversation?.from?.name ||
          'Unknown sender';

        const senderEmail = getSenderEmail(
          conversation,
          latestMessage
        );

        const subject = getConversationSubject(conversation);
        const preview =
          latestMessage?.snippet ||
          latestMessage?.preview ||
          latestMessage?.text ||
          conversation?.snippet ||
          conversation?.preview ||
          '';

        const date =
          latestMessage?.receivedAt ||
          latestMessage?.date ||
          latestMessage?.createdAt ||
          conversation?.updatedAt ||
          conversation?.createdAt;

        const handledBy = getHandledBy(conversation);
        const repliedBy = getRepliedBy(conversation);

        const isSelected = String(selectedId) === String(id);

        return (
          <button
            type="button"
            key={id}
            className={
              isSelected
                ? 'email-list-item selected'
                : 'email-list-item'
            }
            onClick={() => {
              if (onSelect) {
                onSelect(conversation);
              }
            }}
          >
            <div className="email-list-avatar">
              {getInitials(sender)}
            </div>

            <div className="email-list-content">
              <div className="email-list-top">
                <div className="email-list-sender">
                  <span className="email-list-sender-name">
                    {sender}
                  </span>

                  {senderEmail && (
                    <span className="email-list-sender-email">
                      {senderEmail}
                    </span>
                  )}
                </div>

                <span className="email-list-date">
                  {date ? formatEmailDate(date) : ''}
                </span>
              </div>

              <div className="email-list-subject">
                {subject || 'No subject'}
              </div>

              {preview && (
                <p className="email-list-preview">
                  {preview}
                </p>
              )}

              <div className="email-list-bottom">
                <ClassificationChip label={getLabel(conversation)} />

                <div className="email-list-activity">
                  {handledBy && (
                    <span>
                      Handled by {handledBy}
                    </span>
                  )}

                  {repliedBy && (
                    <span>
                      Replied by {repliedBy}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default EmailList;