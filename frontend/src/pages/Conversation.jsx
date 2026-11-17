import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  Archive,
  Star,
  Mail,
  MailOpen,
  RefreshCw,
  Clock,
  Calendar,
  User,
  Users,
  Bot,
  Sparkles,
  Send,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  MessageSquare,
  FileText,
  Tag,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  Paperclip,
  X,
} from 'lucide-react';

import { conversationsAPI, aiAPI } from '../api.js';
import { formatDateTime, formatTimeAgo, getInitials } from '../utils.js';
import { ClassificationChip } from '../ui/ClassificationChip.jsx';


/* =========================================================
   HELPERS
========================================================= */

const getPayload = (response) => {
  return response?.data?.data || response?.data || response || {};
};


const getMessages = (conversation) => {
  const messages =
    conversation?.messages ||
    conversation?.thread ||
    conversation?.emails ||
    [];

  return Array.isArray(messages) ? messages : [];
};


const getMessageSender = (message) => {
  const from = message?.from || message?.sender || {};

  if (typeof from === 'string') {
    return from;
  }

  return (
    from?.name ||
    from?.email ||
    message?.fromName ||
    message?.senderName ||
    'Unknown sender'
  );
};


const getMessageEmail = (message) => {
  const from = message?.from || message?.sender || {};

  if (typeof from === 'string') {
    return from.includes('@') ? from : '';
  }

  return (
    from?.email ||
    message?.fromEmail ||
    message?.senderEmail ||
    ''
  );
};


const getMessageBody = (message) => {
  return (
    message?.body ||
    message?.text ||
    message?.html ||
    message?.content ||
    'No message content available.'
  );
};


const getMessageDate = (message) => {
  return (
    message?.sentAt ||
    message?.receivedAt ||
    message?.date ||
    message?.createdAt ||
    null
  );
};


const getMessageAttachments = (message) => {
  const attachments = message?.attachments;

  return Array.isArray(attachments) ? attachments : [];
};


const getConversationLabel = (conversation) => {
  return (
    conversation?.label ||
    conversation?.aiLabel ||
    conversation?.classification ||
    'general'
  );
};


const getConversationSubject = (conversation) => {
  return conversation?.subject || '(No subject)';
};


const getConversationAccount = (conversation) => {
  const account = conversation?.accountId;

  if (typeof account === 'object' && account !== null) {
    return (
      account.label ||
      account.address ||
      account.email ||
      ''
    );
  }

  return conversation?.accountEmail || '';
};


const getActivity = (conversation) => {
  const activity =
    conversation?.activity ||
    conversation?.activities ||
    conversation?.timeline ||
    [];

  return Array.isArray(activity) ? activity : [];
};


const getSummaryText = (summary) => {
  if (typeof summary === 'string') {
    return summary;
  }

  return (
    summary?.text ||
    summary?.summary ||
    summary?.content ||
    ''
  );
};


const getError = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};


/* =========================================================
   MESSAGE CARD
========================================================= */

function MessageCard({ message, index, total }) {
  const [expanded, setExpanded] = useState(index === total - 1);

  const sender = getMessageSender(message);
  const email = getMessageEmail(message);
  const date = getMessageDate(message);
  const body = getMessageBody(message);
  const attachments = getMessageAttachments(message);

  const isLatest = index === total - 1;

  return (
    <article className={`conversation-message ${expanded ? 'expanded' : ''}`}>

      <button
        type="button"
        className="conversation-message-header"
        onClick={() => setExpanded((value) => !value)}
      >

        <div className="conversation-message-avatar">
          {getInitials(sender)}
        </div>

        <div className="conversation-message-heading">

          <div className="conversation-message-sender">
            <strong>{sender}</strong>

            {isLatest && (
              <span className="conversation-latest-badge">
                Latest
              </span>
            )}
          </div>

          <span className="conversation-message-email">
            {email || 'Email address unavailable'}
          </span>

        </div>

        <div className="conversation-message-date">
          {date ? formatTimeAgo(date) : ''}
        </div>

        <span className="conversation-message-expand">
          {expanded
            ? <ChevronUp size={16} />
            : <ChevronDown size={16} />}
        </span>

      </button>


      {expanded && (
        <div className="conversation-message-content">

          <div className="conversation-message-details">

            <span>
              <User size={13} />
              {sender}
            </span>

            {date && (
              <span>
                <Clock size={13} />
                {formatDateTime(date)}
              </span>
            )}

          </div>


          <div className="conversation-message-body">
            {body}
          </div>


          {attachments.length > 0 && (
            <div className="conversation-attachments">

              <span className="conversation-attachments-title">
                <Paperclip size={13} />
                {attachments.length} attachment
                {attachments.length > 1 ? 's' : ''}
              </span>

              <div className="conversation-attachment-list">

                {attachments.map((attachment, attachmentIndex) => (

                  <div
                    className="conversation-attachment"
                    key={attachment._id || attachmentIndex}
                  >
                    <FileText size={15} />

                    <span>
                      {attachment.filename ||
                        attachment.name ||
                        'Attachment'}
                    </span>

                  </div>

                ))}

              </div>

            </div>
          )}

        </div>
      )}

    </article>
  );
}


/* =========================================================
   AI SUMMARY
========================================================= */

function AISummary({ summary, loading, onGenerate }) {
  return (
    <section className="conversation-ai-card">

      <div className="conversation-ai-heading">

        <div className="conversation-ai-title">
          <span className="conversation-ai-icon">
            <Sparkles size={16} />
          </span>

          <div>
            <h3>AI Summary</h3>
            <span>Conversation overview</span>
          </div>
        </div>

        <button
          type="button"
          className="conversation-ai-refresh"
          onClick={onGenerate}
          disabled={loading}
          title="Regenerate summary"
        >
          <RefreshCw
            size={15}
            className={loading ? 'conversation-spin' : ''}
          />
        </button>

      </div>


      <div className="conversation-ai-content">

        {loading ? (

          <div className="conversation-ai-loading">
            <RefreshCw size={16} className="conversation-spin" />
            Generating summary...
          </div>

        ) : summary ? (

          <p>{summary}</p>

        ) : (

          <div className="conversation-ai-empty">
            <p>AI summary is not available for this conversation.</p>

            <button
              type="button"
              onClick={onGenerate}
            >
              Generate summary
            </button>
          </div>

        )}

      </div>

    </section>
  );
}


/* =========================================================
   ACTIVITY TIMELINE
========================================================= */

function ActivityTimeline({ activities }) {
  if (!activities.length) {
    return (
      <div className="conversation-activity-empty">
        <Clock size={16} />
        <span>No activity recorded yet.</span>
      </div>
    );
  }

  return (
    <div className="conversation-activity-list">

      {activities.map((activity, index) => {

        const actor =
          activity?.actor?.name ||
          activity?.performedBy?.name ||
          activity?.user?.name ||
          activity?.actorName ||
          'System';

        const action =
          activity?.description ||
          activity?.message ||
          activity?.action ||
          'Updated conversation';

        const date =
          activity?.createdAt ||
          activity?.timestamp ||
          activity?.date;

        return (
          <div
            className="conversation-activity-item"
            key={activity._id || activity.id || index}
          >

            <div className="conversation-activity-marker">
              {index === 0
                ? <CheckCircle2 size={15} />
                : <Circle size={12} />}
            </div>

            <div className="conversation-activity-content">

              <p>
                <strong>{actor}</strong>
                {' '}
                {action}
              </p>

              {date && (
                <span>{formatTimeAgo(date)}</span>
              )}

            </div>

          </div>
        );
      })}

    </div>
  );
}


/* =========================================================
   ASK AI
========================================================= */

function AskAI({ conversationId }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAsk = async (event) => {
    event.preventDefault();

    if (!question.trim() || loading) return;

    try {
      setLoading(true);
      setError('');
      setAnswer('');

      const response = await aiAPI.askAboutConversation(
        conversationId,
        { question: question.trim() }
      );

      const result = getPayload(response);

      setAnswer(
        result.answer ||
        result.response ||
        result.text ||
        result.message ||
        'No answer was returned.'
      );

    } catch (err) {
      setError(getError(err, 'Unable to get an AI response.'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <section className="conversation-ask-card">

      <div className="conversation-section-heading">
        <div className="conversation-section-icon">
          <Bot size={16} />
        </div>

        <div>
          <h3>Ask about this email</h3>
          <p>Get answers based on this conversation.</p>
        </div>
      </div>


      <form
        className="conversation-ask-form"
        onSubmit={handleAsk}
      >

        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about this conversation..."
          rows={3}
        />

        <div className="conversation-ask-footer">

          <span>AI-generated responses may need verification.</span>

          <button
            type="submit"
            disabled={!question.trim() || loading}
          >
            {loading ? (
              <RefreshCw size={14} className="conversation-spin" />
            ) : (
              <Send size={14} />
            )}

            Ask AI
          </button>

        </div>

      </form>


      {error && (
        <div className="conversation-ai-error">
          <AlertCircle size={14} />
          {error}
        </div>
      )}


      {answer && (
        <div className="conversation-ai-answer">

          <div className="conversation-ai-answer-heading">
            <Sparkles size={14} />
            AI Response
          </div>

          <p>{answer}</p>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(answer);
            }}
          >
            <Copy size={13} />
            Copy response
          </button>

        </div>
      )}

    </section>
  );
}


/* =========================================================
   CONVERSATION PAGE
========================================================= */

export default function Conversation() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState(null);
  const [summary, setSummary] = useState('');
  const [whyLabel, setWhyLabel] = useState('');

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [whyLoading, setWhyLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showWhyLabel, setShowWhyLabel] = useState(false);


  /* =====================================================
     FETCH CONVERSATION
  ===================================================== */

  const fetchConversation = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await conversationsAPI.getById(id);
      const result = getPayload(response);

      const item =
        result.conversation ||
        result.item ||
        result;

      setConversation(item);

      const initialSummary = getSummaryText(
        item.summary || item.aiSummary
      );

      setSummary(initialSummary);

      if (item.isUnread || item.unread || item.read === false) {
        try {
          await conversationsAPI.markRead(id);
        } catch {
          // Opening the conversation should not fail
          // if read status cannot be updated.
        }
      }

    } catch (err) {
      setError(
        getError(err, 'Unable to load this conversation.')
      );
    } finally {
      setLoading(false);
    }
  }, [id]);


  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);


  /* =====================================================
     SUMMARY
  ===================================================== */

  const generateSummary = async () => {
    try {
      setSummaryLoading(true);
      setError('');

      const response = await aiAPI.getSummary(id);
      const result = getPayload(response);

      const newSummary = getSummaryText(
        result.summary ||
        result.aiSummary ||
        result
      );

      if (newSummary) {
        setSummary(newSummary);
      }

    } catch (err) {
      setError(
        getError(err, 'Unable to generate AI summary.')
      );
    } finally {
      setSummaryLoading(false);
    }
  };


  /* =====================================================
     WHY THIS LABEL
  ===================================================== */

  const fetchWhyLabel = async () => {
    try {
      setWhyLoading(true);
      setError('');

      const response = await aiAPI.getWhyLabel(id);
      const result = getPayload(response);

      setWhyLabel(
        result.reason ||
        result.explanation ||
        result.why ||
        result.text ||
        result.message ||
        ''
      );

    } catch (err) {
      setError(
        getError(err, 'Unable to explain this classification.')
      );
    } finally {
      setWhyLoading(false);
    }
  };


  /* =====================================================
     STAR
  ===================================================== */

  const handleStar = async () => {
    if (!conversation) return;

    const previous = conversation;

    setConversation((current) => ({
      ...current,
      isStarred: !(
        current.isStarred ||
        current.starred
      ),
    }));

    try {
      await conversationsAPI.toggleStar(id);
    } catch (err) {
      setConversation(previous);

      setError(
        getError(err, 'Unable to update star status.')
      );
    }
  };


  /* =====================================================
     ARCHIVE
  ===================================================== */

  const handleArchive = async () => {
    try {
      setActionLoading(true);
      setError('');

      await conversationsAPI.archive(id);

      setSuccess('Conversation archived.');

      setTimeout(() => {
        navigate('/inbox');
      }, 500);

    } catch (err) {
      setError(
        getError(err, 'Unable to archive conversation.')
      );
    } finally {
      setActionLoading(false);
    }
  };


  /* =====================================================
     COMPLETE
  ===================================================== */

  const handleComplete = async () => {
    try {
      setActionLoading(true);
      setError('');

      await conversationsAPI.complete(id);

      setSuccess('Conversation marked as handled.');

      await fetchConversation();

    } catch (err) {
      setError(
        getError(err, 'Unable to update conversation status.')
      );
    } finally {
      setActionLoading(false);
    }
  };


  /* =====================================================
     DERIVED DATA
  ===================================================== */

  const messages = useMemo(
    () => getMessages(conversation),
    [conversation]
  );

  const activities = useMemo(
    () => getActivity(conversation),
    [conversation]
  );

  const label = conversation
    ? getConversationLabel(conversation)
    : 'general';

  const isStarred = Boolean(
    conversation?.isStarred ||
    conversation?.starred
  );

  const sender =
    conversation?.fromName ||
    conversation?.sender?.name ||
    conversation?.fromEmail ||
    conversation?.sender?.email ||
    'Unknown sender';

  const account = conversation
    ? getConversationAccount(conversation)
    : '';

  const subject = conversation
    ? getConversationSubject(conversation)
    : '';


  /* =====================================================
     LOADING STATE
  ===================================================== */

  if (loading) {
    return (
      <div className="conversation-page-state">

        <RefreshCw
          size={23}
          className="conversation-spin"
        />

        <p>Loading conversation...</p>

      </div>
    );
  }


  /* =====================================================
     ERROR STATE
  ===================================================== */

  if (!conversation) {
    return (
      <div className="conversation-page-state">

        <div className="conversation-error-icon">
          <AlertCircle size={25} />
        </div>

        <h2>Conversation unavailable</h2>

        <p>{error || 'This conversation could not be found.'}</p>

        <button
          type="button"
          onClick={() => navigate('/inbox')}
        >
          <ArrowLeft size={15} />
          Back to inbox
        </button>

      </div>
    );
  }


  /* =====================================================
     MAIN PAGE
  ===================================================== */

  return (
    <div className="conversation-page">

      {/* HEADER */}

      <div className="conversation-page-header">

        <div className="conversation-header-left">

          <button
            type="button"
            className="conversation-back-button"
            onClick={() => navigate(-1)}
            title="Back"
          >
            <ArrowLeft size={17} />
          </button>

          <div>
            <div className="conversation-breadcrumb">
              Inbox
              <span>/</span>
              Conversation
            </div>

            <h1>Conversation details</h1>
          </div>

        </div>


        <div className="conversation-header-actions">

          <button
            type="button"
            className={`conversation-action-button ${
              isStarred ? 'starred' : ''
            }`}
            onClick={handleStar}
            title={isStarred ? 'Remove star' : 'Add star'}
          >
            <Star
              size={15}
              fill={isStarred ? 'currentColor' : 'none'}
            />
          </button>

          <button
            type="button"
            className="conversation-action-button"
            onClick={handleArchive}
            disabled={actionLoading}
          >
            <Archive size={15} />
            Archive
          </button>

          <button
            type="button"
            className="conversation-action-button primary"
            onClick={handleComplete}
            disabled={actionLoading}
          >
            <Check size={15} />
            Mark handled
          </button>

        </div>

      </div>


      {/* FEEDBACK */}

      {error && (
        <div className="conversation-feedback error">
          <AlertCircle size={15} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="conversation-feedback success">
          <CheckCircle2 size={15} />
          {success}
        </div>
      )}


      {/* SUBJECT */}

      <section className="conversation-subject-card">

        <div className="conversation-subject-top">

          <div className="conversation-subject-main">

            <h2>{subject}</h2>

            <div className="conversation-subject-meta">

              <span className="conversation-sender-info">
                <User size={13} />
                {sender}
              </span>

              {account && (
                <span className="conversation-account-info">
                  <Mail size={13} />
                  {account}
                </span>
              )}

            </div>

          </div>

          <ClassificationChip label={label} />

        </div>


        <div className="conversation-subject-bottom">

          <button
            type="button"
            className="conversation-why-button"
            onClick={() => {
              const next = !showWhyLabel;

              setShowWhyLabel(next);

              if (next && !whyLabel) {
                fetchWhyLabel();
              }
            }}
          >
            <Sparkles size={13} />
            Why this label?

            {showWhyLabel
              ? <ChevronUp size={13} />
              : <ChevronDown size={13} />}
          </button>

          <span>
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>

        </div>


        {showWhyLabel && (
          <div className="conversation-why-content">

            {whyLoading ? (
              <span>
                <RefreshCw size={13} className="conversation-spin" />
                Analysing classification...
              </span>
            ) : (
              <p>
                {whyLabel ||
                  'No classification explanation is available.'}
              </p>
            )}

          </div>
        )}

      </section>


      {/* MAIN CONTENT */}

      <div className="conversation-content-grid">

        {/* LEFT: EMAIL THREAD */}

        <main className="conversation-thread-column">

          <div className="conversation-section-heading thread-heading">

            <div className="conversation-section-icon">
              <MessageSquare size={16} />
            </div>

            <div>
              <h3>Email conversation</h3>
              <p>Full message history</p>
            </div>

            <span className="conversation-message-count">
              {messages.length}
            </span>

          </div>


          <div className="conversation-thread">

            {messages.length > 0 ? (

              messages.map((message, index) => (

                <MessageCard
                  key={message._id || message.id || index}
                  message={message}
                  index={index}
                  total={messages.length}
                />

              ))

            ) : (

              <div className="conversation-no-messages">
                <MailOpen size={22} />
                <p>No messages available in this conversation.</p>
              </div>

            )}

          </div>


          {/* ACTIVITY */}

          <section className="conversation-activity-card">

            <div className="conversation-section-heading">

              <div className="conversation-section-icon">
                <Clock size={16} />
              </div>

              <div>
                <h3>Activity timeline</h3>
                <p>Conversation updates and actions</p>
              </div>

            </div>

            <ActivityTimeline activities={activities} />

          </section>

        </main>


        {/* RIGHT: AI PANEL */}

        <aside className="conversation-ai-column">

          <AISummary
            summary={summary}
            loading={summaryLoading}
            onGenerate={generateSummary}
          />


          {/* CONVERSATION DETAILS */}

          <section className="conversation-details-card">

            <div className="conversation-section-heading">

              <div className="conversation-section-icon">
                <FileText size={16} />
              </div>

              <div>
                <h3>Details</h3>
                <p>Conversation information</p>
              </div>

            </div>


            <div className="conversation-detail-list">

              <div className="conversation-detail-item">
                <span>
                  <Tag size={14} />
                  Classification
                </span>

                <ClassificationChip label={label} />
              </div>


              <div className="conversation-detail-item">
                <span>
                  <Mail size={14} />
                  Email account
                </span>

                <strong>{account || 'Not available'}</strong>
              </div>


              <div className="conversation-detail-item">
                <span>
                  <Calendar size={14} />
                  Last updated
                </span>

                <strong>
                  {conversation.updatedAt
                    ? formatTimeAgo(conversation.updatedAt)
                    : 'Not available'}
                </strong>
              </div>


              <div className="conversation-detail-item">
                <span>
                  <Users size={14} />
                  Handled by
                </span>

                <strong>
                  {conversation.handledBy?.name ||
                    conversation.assignedTo?.name ||
                    conversation.owner?.name ||
                    'Not assigned'}
                </strong>
              </div>

            </div>

          </section>


          {/* ASK AI */}

          <AskAI conversationId={id} />

        </aside>

      </div>

    </div>
  );
}