import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Search,
  RefreshCw,
  Mail,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Inbox,
  X,
} from 'lucide-react';

import { clientAPI } from '../api.js';
import { formatTimeAgo } from '../utils.js';


const PAGE_SIZE = 25;


const getResponseData = (response) => {
  const payload = response?.data ?? response ?? {};

  return payload?.data &&
    typeof payload.data === 'object'
    ? payload.data
    : payload;
};


const getId = (item) => {
  return String(item?._id || item?.id || '');
};


const getSender = (item) => {
  const message = item?.lastMessage ||
    item?.messages?.[item?.messages?.length - 1];

  return (
    item?.fromName ||
    item?.sender?.name ||
    message?.from?.name ||
    message?.fromName ||
    item?.fromEmail ||
    item?.sender?.email ||
    'Unknown sender'
  );
};


const getSubject = (item) => {
  return item?.subject || '(No subject)';
};


const getSummary = (item) => {
  return (
    item?.summary?.text ||
    item?.summary ||
    item?.aiSummary ||
    item?.snippet ||
    'Summary is not available for this conversation.'
  );
};


const getReason = (item) => {
  return (
    item?.ownerAttentionReason ||
    item?.reason ||
    item?.classificationReason ||
    item?.aiReason ||
    'This conversation requires your attention.'
  );
};


const getDate = (item) => {
  return (
    item?.lastMessageAt ||
    item?.updatedAt ||
    item?.createdAt ||
    null
  );
};


const getAccount = (item) => {
  const account = item?.accountId;

  if (account && typeof account === 'object') {
    return (
      account.label ||
      account.email ||
      account.address ||
      'Email account'
    );
  }

  return item?.accountEmail || 'Email account';
};


export default function ClientView() {
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);


  /* =====================================================
     FETCH CLIENT CONVERSATIONS
  ===================================================== */

  const fetchConversations = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const response = await clientAPI.getInbox({
        page,
        limit: PAGE_SIZE,
        ...(search.trim()
          ? { search: search.trim() }
          : {}),
      });

      const data = getResponseData(response);

      const items = [
        data?.conversations,
        data?.items,
        data?.results,
      ].find(Array.isArray) || [];

      setConversations(items);

      const total = Number(
        data?.total ??
        data?.pagination?.total ??
        items.length
      );

      setTotalCount(
        Number.isFinite(total) ? total : items.length
      );

      const pages = Number(
        data?.totalPages ??
        data?.pagination?.totalPages ??
        Math.ceil(total / PAGE_SIZE)
      );

      setTotalPages(
        Number.isFinite(pages) && pages > 0 ? pages : 1
      );

    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load your conversations.'
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search]);


  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchConversations();
    }, search ? 300 : 0);

    return () => clearTimeout(timeout);
  }, [fetchConversations, search]);


  /* =====================================================
     OPEN CONVERSATION
  ===================================================== */

  const openConversation = (conversation) => {
    const id = getId(conversation);

    if (!id) return;

    navigate(`/conversation/${id}`);
  };


  /* =====================================================
     MARK HANDLED
  ===================================================== */

  const handleMarkHandled = async (conversation) => {
    const id = getId(conversation);

    if (!id) return;

    const previous = conversations;

    setConversations((current) =>
      current.filter((item) => getId(item) !== id)
    );

    try {
      await clientAPI.markHandled(id);

      setTotalCount((current) => Math.max(0, current - 1));

    } catch (err) {
      setConversations(previous);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to mark this conversation as handled.'
      );
    }
  };


  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="client-view-page">

      {/* HEADER */}

      <div className="client-view-heading">

        <div>
          <div className="client-view-breadcrumb">
            Client View
            <span>/</span>
            Inbox
          </div>

          <h1>Your attention needed</h1>

          <p>
            Conversations that may need your reply or decision.
          </p>
        </div>


        <button
          type="button"
          className="client-view-refresh"
          onClick={() => fetchConversations(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={15}
            className={refreshing ? 'client-view-rotating' : ''}
          />
          Refresh
        </button>

      </div>


      {/* SUMMARY */}

      <div className="client-view-summary">

        <div className="client-view-summary-icon">
          <Mail size={20} />
        </div>

        <div>
          <span>Pending attention</span>
          <strong>{totalCount}</strong>
        </div>

        <p>
          Only conversations requiring your attention
          are shown here.
        </p>

      </div>


      {/* MAIN PANEL */}

      <section className="client-view-panel">

        {/* TOOLBAR */}

        <div className="client-view-toolbar">

          <div className="client-view-search">

            <Search size={16} />

            <input
              type="text"
              placeholder="Search your conversations..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}

          </div>

          <span className="client-view-result-count">
            {totalCount} conversations
          </span>

        </div>


        {/* ERROR */}

        {error && (
          <div className="client-view-error">
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

          <div className="client-view-loading">
            <RefreshCw
              size={20}
              className="client-view-rotating"
            />
            Loading your inbox...
          </div>

        ) : conversations.length > 0 ? (

          /* CONVERSATION CARDS */

          <div className="client-view-list">

            {conversations.map((conversation) => {
              const id = getId(conversation);
              const date = getDate(conversation);

              return (
                <article
                  className="client-conversation-card"
                  key={id}
                >

                  <div className="client-conversation-header">

                    <div className="client-conversation-sender">
                      <h3>{getSender(conversation)}</h3>

                      <span>
                        {date ? formatTimeAgo(date) : ''}
                      </span>
                    </div>

                    <span className="client-account-badge">
                      {getAccount(conversation)}
                    </span>

                  </div>


                  <h4 className="client-conversation-subject">
                    {getSubject(conversation)}
                  </h4>


                  <div className="client-summary-block">

                    <span className="client-detail-label">
                      AI summary
                    </span>

                    <p>
                      {getSummary(conversation)}
                    </p>

                  </div>


                  <div className="client-reason-block">

                    <div className="client-reason-heading">
                      <AlertCircle size={15} />
                      <span>Why your attention is needed</span>
                    </div>

                    <p>
                      {getReason(conversation)}
                    </p>

                  </div>


                  <div className="client-conversation-actions">

                    <button
                      type="button"
                      className="client-open-button"
                      onClick={() => openConversation(conversation)}
                    >
                      Open conversation
                      <ArrowUpRight size={15} />
                    </button>


                    <button
                      type="button"
                      className="client-handled-button"
                      onClick={() => handleMarkHandled(conversation)}
                    >
                      <CheckCircle2 size={15} />
                      Mark handled
                    </button>

                  </div>

                </article>
              );
            })}

          </div>

        ) : (

          /* EMPTY STATE */

          <div className="client-view-empty">

            <div className="client-view-empty-icon">
              <CheckCircle2 size={27} />
            </div>

            <h3>
              {search
                ? 'No matching conversations'
                : 'You are all caught up'}
            </h3>

            <p>
              {search
                ? 'Try another search term.'
                : 'There are currently no conversations waiting for your attention.'}
            </p>

          </div>

        )}


        {/* PAGINATION */}

        {!loading && conversations.length > 0 && (

          <div className="client-view-pagination">

            <span>
              Showing{' '}
              {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}
              {' – '}
              {Math.min(page * PAGE_SIZE, totalCount)}
              {' of '}
              {totalCount}
            </span>

            <div>

              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                aria-label="Previous page"
              >
                Previous
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
                Next
              </button>

            </div>

          </div>

        )}

      </section>

    </div>
  );
}