
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import {
  Search,
  RefreshCw,
  Star,
  Archive,
  Mail,
  MailOpen,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Inbox as InboxIcon,
  Filter,
  X,
  AlertCircle,
  Clock3,
  UserCheck,
  Paperclip,
} from 'lucide-react';

import { conversationsAPI } from '../api.js';
import { formatTimeAgo } from '../utils.js';
import { ClassificationChip } from '../ui/ClassificationChip.jsx';


/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 25;

const SEGMENTS = [
  { id: 'all', label: 'All conversations' },
  { id: 'client_to_reply', label: 'Client to Reply' },
  { id: 'assistant_to_reply', label: 'Assistant to Reply' },
  { id: 'no_reply_needed', label: 'No Reply Needed' },
  { id: 'needs_review', label: 'Needs Review' },
  { id: 'action_required', label: 'Action Required' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'meeting', label: 'Meetings' },
  { id: 'important', label: 'Important' },
  { id: 'general', label: 'General' },
  { id: 'archived', label: 'Archived' },
];

const LABEL_OPTIONS = [
  { value: 'all', label: 'All classifications' },
  { value: 'client_to_reply', label: 'Client to Reply' },
  { value: 'assistant_to_reply', label: 'Assistant to Reply' },
  { value: 'no_reply_needed', label: 'No Reply Needed' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'action_required', label: 'Action Required' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'important', label: 'Important' },
  { value: 'general', label: 'General' },
];


/* =========================================================
   HELPERS
========================================================= */

const getArray = (...values) => {
  return values.find(Array.isArray) || [];
};


const getConversationId = (item) => {
  return String(item?._id || item?.id || '');
};


const getLastMessage = (item) => {
  if (Array.isArray(item?.messages) && item.messages.length > 0) {
    return item.messages[item.messages.length - 1];
  }

  return item?.lastMessage || null;
};


const getSender = (item) => {
  const message = getLastMessage(item);

  return (
    item?.fromName ||
    item?.sender?.name ||
    message?.from?.name ||
    message?.fromName ||
    item?.fromEmail ||
    item?.sender?.email ||
    message?.from?.email ||
    'Unknown sender'
  );
};


const getSenderEmail = (item) => {
  const message = getLastMessage(item);

  return (
    item?.fromEmail ||
    item?.sender?.email ||
    message?.from?.email ||
    ''
  );
};


const getSubject = (item) => {
  return item?.subject || '(No subject)';
};


const getPreview = (item) => {
  const message = getLastMessage(item);

  return (
    item?.snippet ||
    item?.summary?.text ||
    item?.summary ||
    message?.body ||
    message?.text ||
    'No preview available.'
  );
};


const getLabel = (item) => {
  return item?.label || item?.aiLabel || 'general';
};


const getAccount = (item) => {
  const account = item?.accountId;

  if (account && typeof account === 'object') {
    return (
      account.label ||
      account.address ||
      account.email ||
      'Email account'
    );
  }

  return item?.accountEmail || 'Email account';
};


const getDate = (item) => {
  return (
    item?.lastMessageAt ||
    item?.updatedAt ||
    item?.createdAt ||
    null
  );
};


const isUnread = (item) => {
  return Boolean(
    item?.isUnread ||
    item?.unread ||
    item?.read === false
  );
};


const isStarred = (item) => {
  return Boolean(item?.isStarred || item?.starred);
};


const getActivityName = (item, type) => {
  const actor =
    type === 'handled'
      ? (
          item?.handledBy ||
          item?.assignedTo ||
          item?.owner
        )
      : (
          item?.repliedBy ||
          item?.lastRepliedBy
        );

  if (typeof actor === 'string') {
    return actor;
  }

  return actor?.name || '';
};


const getResponseData = (response) => {
  const payload = response?.data ?? response ?? {};

  if (
    payload?.data &&
    typeof payload.data === 'object'
  ) {
    return payload.data;
  }

  return payload;
};


const getNumber = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      const number = Number(value);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return 0;
};


/* =========================================================
   INBOX TOOLBAR
========================================================= */

function InboxToolbar({
  selectedCount,
  allSelected,
  onSelectAll,
  onRefresh,
  onBulkRead,
  onBulkArchive,
  refreshing,
}) {
  return (
    <div className="inbox-toolbar">

      <div className="inbox-toolbar-left">

        <button
          type="button"
          className="inbox-toolbar-icon"
          onClick={onSelectAll}
          aria-label="Select all conversations"
          title="Select all"
        >
          {allSelected
            ? <CheckSquare size={17} />
            : <Square size={17} />}
        </button>

        {selectedCount > 0 ? (
          <>
            <span className="inbox-selected-count">
              {selectedCount} selected
            </span>

            <button
              type="button"
              className="inbox-toolbar-icon"
              onClick={onBulkRead}
              title="Mark as read"
              aria-label="Mark selected as read"
            >
              <MailOpen size={17} />
            </button>

            <button
              type="button"
              className="inbox-toolbar-icon"
              onClick={onBulkArchive}
              title="Archive"
              aria-label="Archive selected"
            >
              <Archive size={17} />
            </button>
          </>
        ) : (
          <span className="inbox-toolbar-label">
            Select conversations
          </span>
        )}

      </div>

      <div className="inbox-toolbar-right">

        <button
          type="button"
          className="inbox-toolbar-icon"
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh inbox"
          aria-label="Refresh inbox"
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'inbox-rotating' : ''}
          />
        </button>

        <button
          type="button"
          className="inbox-toolbar-icon"
          title="More options"
          aria-label="More options"
        >
          <MoreHorizontal size={18} />
        </button>

      </div>

    </div>
  );
}


/* =========================================================
   INBOX ROW
========================================================= */

function InboxRow({
  conversation,
  selected,
  onSelect,
  onOpen,
  onStar,
  onRead,
  onArchive,
}) {
  const sender = getSender(conversation);
  const senderEmail = getSenderEmail(conversation);
  const subject = getSubject(conversation);
  const preview = getPreview(conversation);
  const label = getLabel(conversation);
  const date = getDate(conversation);

  const unread = isUnread(conversation);
  const starred = isStarred(conversation);

  const handledBy = getActivityName(conversation, 'handled');
  const repliedBy = getActivityName(conversation, 'replied');

  const hasAttachments = Boolean(
    conversation?.hasAttachments ||
    conversation?.messages?.some(
      (message) =>
        Array.isArray(message?.attachments) &&
        message.attachments.length > 0
    )
  );

  return (
    <div
      className={`inbox-row ${unread ? 'unread' : ''} ${
        selected ? 'selected' : ''
      }`}
    >

      <button
        type="button"
        className="inbox-row-checkbox"
        onClick={onSelect}
        aria-label={
          selected
            ? 'Deselect conversation'
            : 'Select conversation'
        }
      >
        {selected
          ? <CheckSquare size={16} />
          : <Square size={16} />}
      </button>


      <button
        type="button"
        className={`inbox-row-star ${starred ? 'active' : ''}`}
        onClick={onStar}
        aria-label={starred ? 'Remove star' : 'Add star'}
        title={starred ? 'Remove star' : 'Add star'}
      >
        <Star
          size={16}
          fill={starred ? 'currentColor' : 'none'}
        />
      </button>


      <button
        type="button"
        className="inbox-row-content"
        onClick={onOpen}
      >

        <div className="inbox-row-main">

          <div className="inbox-row-sender">

            <span className="inbox-sender-name">
              {sender}
            </span>

            {senderEmail && (
              <span className="inbox-sender-email">
                {senderEmail}
              </span>
            )}

          </div>


          <div className="inbox-row-subject">

            <span className="inbox-subject-text">
              {subject}
            </span>

            <span className="inbox-subject-separator">
              —
            </span>

            <span className="inbox-preview-text">
              {preview}
            </span>

          </div>


          <div className="inbox-row-meta">

            <ClassificationChip label={label} />

            <span className="inbox-account-name">
              {getAccount(conversation)}
            </span>

            {handledBy && (
              <span className="inbox-handler">
                <UserCheck size={12} />
                Handled by {handledBy}
              </span>
            )}

            {repliedBy && (
              <span className="inbox-handler">
                Replied by {repliedBy}
              </span>
            )}

            {hasAttachments && (
              <Paperclip
                size={13}
                className="inbox-attachment-icon"
              />
            )}

          </div>

        </div>

      </button>


      <div className="inbox-row-actions">

        <button
          type="button"
          className="inbox-row-action"
          onClick={onRead}
          title={unread ? 'Mark as read' : 'Mark as unread'}
          aria-label={unread ? 'Mark as read' : 'Mark as unread'}
        >
          {unread
            ? <MailOpen size={15} />
            : <Mail size={15} />}
        </button>

        <button
          type="button"
          className="inbox-row-action"
          onClick={onArchive}
          title="Archive"
          aria-label="Archive conversation"
        >
          <Archive size={15} />
        </button>

      </div>


      <span className="inbox-row-date">
        {date ? formatTimeAgo(date) : ''}
      </span>

    </div>
  );
}


/* =========================================================
   INBOX PAGE
========================================================= */

export default function Inbox() {
  const navigate = useNavigate();
  const { segment } = useParams();

  const requestSequence = useRef(0);

  const [conversations, setConversations] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');

  const [selectedIds, setSelectedIds] = useState([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);


  /* =====================================================
     FETCH CONVERSATIONS
  ===================================================== */

  const fetchConversations = useCallback(async (refresh = false) => {
    const requestId = ++requestSequence.current;

    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const params = {
        page,
        limit: PAGE_SIZE,
      };

      if (segment && segment !== 'all') {
        params.segment = segment;
      }

      if (search.trim()) {
        params.search = search.trim();
      }

      if (selectedLabel !== 'all') {
        params.label = selectedLabel;
      }

      if (selectedAccount !== 'all') {
        params.accountId = selectedAccount;
      }

      const response = await conversationsAPI.getAll(params);

      if (requestId !== requestSequence.current) {
        return;
      }

      const data = getResponseData(response);

      const items = getArray(
        data?.conversations,
        data?.items,
        data?.results,
        data?.data?.conversations,
        data?.data?.items
      );

      setConversations(items);

      const total = getNumber(
        data?.total,
        data?.totalCount,
        data?.pagination?.total,
        data?.pagination?.totalCount,
        items.length
      );

      setTotalCount(total);

      const calculatedPages = Math.max(
        1,
        Math.ceil(total / PAGE_SIZE)
      );

      setTotalPages(
        Math.max(
          1,
          getNumber(
            data?.totalPages,
            data?.pagination?.totalPages,
            calculatedPages
          )
        )
      );

      const accountMap = new Map();

      items.forEach((item) => {
        const account = item?.accountId;

        if (account && typeof account === 'object') {
          const id = account._id || account.id;

          if (id) {
            accountMap.set(String(id), account);
          }
        }
      });

      setAccounts(Array.from(accountMap.values()));
      setSelectedIds([]);

    } catch (err) {
      if (requestId !== requestSequence.current) {
        return;
      }

      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load conversations.'
      );

    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    page,
    segment,
    search,
    selectedLabel,
    selectedAccount,
  ]);


  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchConversations();
    }, search ? 300 : 0);

    return () => {
      clearTimeout(timeout);
    };
  }, [fetchConversations, search]);


  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [segment]);


  /* =====================================================
     SELECTION
  ===================================================== */

  const allSelected =
    conversations.length > 0 &&
    selectedIds.length === conversations.length;

  const toggleSelection = (id) => {
    setSelectedIds((current) => {
      return current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
    });
  };


  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(
        conversations
          .map(getConversationId)
          .filter(Boolean)
      );
    }
  };


  /* =====================================================
     SINGLE CONVERSATION ACTIONS
  ===================================================== */

  const handleStar = async (conversation) => {
    const id = getConversationId(conversation);

    if (!id) return;

    const previous = conversations;

    setConversations((current) =>
      current.map((item) => {
        if (getConversationId(item) !== id) {
          return item;
        }

        const nextStarred = !isStarred(item);

        return {
          ...item,
          isStarred: nextStarred,
          starred: nextStarred,
        };
      })
    );

    try {
      await conversationsAPI.toggleStar(id);

    } catch (err) {
      setConversations(previous);

      setError(
        err?.response?.data?.message ||
        'Unable to update star status.'
      );
    }
  };


  const handleRead = async (conversation) => {
    const id = getConversationId(conversation);

    if (!id) return;

    const unread = isUnread(conversation);
    const previous = conversations;

    setConversations((current) =>
      current.map((item) => {
        if (getConversationId(item) !== id) {
          return item;
        }

        return {
          ...item,
          isUnread: !unread,
          unread: !unread,
          read: unread,
        };
      })
    );

    try {
      await conversationsAPI.markRead(id);

    } catch (err) {
      setConversations(previous);

      setError(
        err?.response?.data?.message ||
        'Unable to update read status.'
      );
    }
  };


  const handleArchive = async (conversation) => {
    const id = getConversationId(conversation);

    if (!id) return;

    const previous = conversations;

    setConversations((current) =>
      current.filter(
        (item) => getConversationId(item) !== id
      )
    );

    try {
      await conversationsAPI.archive(id);

      setSelectedIds((current) =>
        current.filter((item) => item !== id)
      );

      setTotalCount((current) => Math.max(0, current - 1));

    } catch (err) {
      setConversations(previous);

      setError(
        err?.response?.data?.message ||
        'Unable to archive conversation.'
      );
    }
  };


  /* =====================================================
     BULK ACTIONS
  ===================================================== */

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) return;

    const previous = conversations;
    const ids = [...selectedIds];

    if (action === 'archive') {
      setConversations((current) =>
        current.filter(
          (item) => !ids.includes(getConversationId(item))
        )
      );
    }

    if (action === 'read') {
      setConversations((current) =>
        current.map((item) =>
          ids.includes(getConversationId(item))
            ? {
                ...item,
                isUnread: false,
                unread: false,
                read: true,
              }
            : item
        )
      );
    }

    try {
      await conversationsAPI.bulkAction({
        action,
        conversationIds: ids,
      });

      if (action === 'archive') {
        setTotalCount((current) =>
          Math.max(0, current - ids.length)
        );
      }

      setSelectedIds([]);

    } catch (err) {
      setConversations(previous);

      setError(
        err?.response?.data?.message ||
        'Unable to complete bulk action.'
      );
    }
  };


  /* =====================================================
     COUNTS
  ===================================================== */

  const unreadCount = useMemo(() => {
    return conversations.filter(isUnread).length;
  }, [conversations]);


  /* =====================================================
     PAGE TITLE
  ===================================================== */

  const activeSegment = SEGMENTS.find(
    (item) => item.id === (segment || 'all')
  );

  const pageTitle = activeSegment?.label || 'Inbox';


  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="inbox-page">

      {/* HEADER */}

      <div className="inbox-page-header">

        <div>

          <div className="inbox-breadcrumb">
            Assistant Dashboard
            <ChevronRight size={13} />
            Inbox
          </div>

          <h1>{pageTitle}</h1>

          <p>
            Manage and organize your email conversations.
          </p>

        </div>

        <div className="inbox-header-count">
          <span>{totalCount.toLocaleString('en-IN')}</span>
          conversations
        </div>

      </div>


      {/* SEGMENT NAVIGATION */}

      <div className="inbox-segment-bar">

        {SEGMENTS.map((item) => (

          <button
            type="button"
            key={item.id}
            className={`inbox-segment-button ${
              (segment || 'all') === item.id ? 'active' : ''
            }`}
            onClick={() => {
              setPage(1);

              navigate(
                item.id === 'all'
                  ? '/inbox'
                  : `/inbox/${item.id}`
              );
            }}
          >
            {item.label}

          </button>

        ))}

      </div>


      {/* INBOX PANEL */}

      <section className="inbox-panel">

        {/* SEARCH AND FILTERS */}

        <div className="inbox-filter-bar">

          <div className="inbox-search-box">

            <Search size={17} />

            <input
              type="text"
              placeholder="Search sender, subject or email..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}

          </div>


          <div className="inbox-select-filter">

            <Filter size={15} />

            <select
              value={selectedLabel}
              onChange={(event) => {
                setSelectedLabel(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by classification"
            >
              {LABEL_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <ChevronDown size={13} />

          </div>


          <div className="inbox-select-filter">

            <select
              value={selectedAccount}
              onChange={(event) => {
                setSelectedAccount(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by account"
            >
              <option value="all">All accounts</option>

              {accounts.map((account) => {
                const accountId = account._id || account.id;

                return (
                  <option
                    key={accountId}
                    value={accountId}
                  >
                    {account.label ||
                      account.address ||
                      account.email ||
                      'Email account'}
                  </option>
                );
              })}

            </select>

            <ChevronDown size={13} />

          </div>

        </div>


        {/* TOOLBAR */}

        <InboxToolbar
          selectedCount={selectedIds.length}
          allSelected={allSelected}
          onSelectAll={toggleSelectAll}
          onRefresh={() => fetchConversations(true)}
          onBulkRead={() => handleBulkAction('read')}
          onBulkArchive={() => handleBulkAction('archive')}
          refreshing={refreshing}
        />


        {/* ERROR */}

        {error && (
          <div className="inbox-inline-error">
            <AlertCircle size={15} />

            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}


        {/* LOADING */}

        {loading ? (

          <div className="inbox-loading">

            <RefreshCw
              size={21}
              className="inbox-rotating"
            />

            <span>Loading conversations...</span>

          </div>

        ) : conversations.length > 0 ? (

          /* CONVERSATIONS */

          <div className="inbox-list">

            {conversations.map((conversation) => {

              const id = getConversationId(conversation);

              return (
                <InboxRow
                  key={id}
                  conversation={conversation}
                  selected={selectedIds.includes(id)}
                  onSelect={() => toggleSelection(id)}
                  onOpen={() => {
                    navigate(`/conversation/${id}`);
                  }}
                  onStar={() => handleStar(conversation)}
                  onRead={() => handleRead(conversation)}
                  onArchive={() => handleArchive(conversation)}
                />
              );
            })}

          </div>

        ) : (

          /* EMPTY STATE */

          <div className="inbox-empty">

            <div className="inbox-empty-icon">
              <InboxIcon size={27} />
            </div>

            <h3>No conversations found</h3>

            <p>
              {search
                ? 'Try a different search term or remove some filters.'
                : 'There are no conversations in this section yet.'}
            </p>

            {(search ||
              selectedLabel !== 'all' ||
              selectedAccount !== 'all') && (

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedLabel('all');
                  setSelectedAccount('all');
                  setPage(1);
                }}
              >
                Clear filters
              </button>

            )}

          </div>

        )}


        {/* PAGINATION */}

        {!loading && conversations.length > 0 && (

          <div className="inbox-pagination">

            <span>
              Showing{' '}
              {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}
              {' '}–{' '}
              {Math.min(page * PAGE_SIZE, totalCount)}
              {' '}of {totalCount}
            </span>

            <div className="inbox-pagination-actions">

              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>

            </div>

          </div>

        )}

      </section>


      {/* FOOTER */}

      <div className="inbox-footer">

        <span>
          <Clock3 size={13} />
          {unreadCount} unread in this page
        </span>

        <span>
          Email conversations are organized automatically.
        </span>

      </div>

    </div>
  );
}
