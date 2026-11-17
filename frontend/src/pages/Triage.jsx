import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  AlertCircle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ArrowUpRight,
  Clock3,
  X,
} from 'lucide-react';

import { conversationsAPI } from '../api.js';
import { formatTimeAgo } from '../utils.js';
import { ClassificationChip } from '../ui/ClassificationChip.jsx';


const PAGE_SIZE = 25;


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


const getPreview = (item) => {
  const message = item?.lastMessage ||
    item?.messages?.[item?.messages?.length - 1];

  return (
    item?.snippet ||
    item?.summary?.text ||
    message?.body ||
    message?.text ||
    'No preview available.'
  );
};


const getLabel = (item) => {
  return item?.label || item?.aiLabel || 'needs_review';
};


const getDate = (item) => {
  return (
    item?.lastMessageAt ||
    item?.updatedAt ||
    item?.createdAt ||
    null
  );
};


const getResponseData = (response) => {
  const payload = response?.data ?? response ?? {};

  return payload?.data &&
    typeof payload.data === 'object'
    ? payload.data
    : payload;
};


export default function Triage() {
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);


  const fetchTriage = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const response = await conversationsAPI.getTriage({
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
        'Unable to load the review queue.'
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search]);


  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchTriage();
    }, search ? 300 : 0);

    return () => clearTimeout(timeout);
  }, [fetchTriage, search]);


  const openConversation = (conversation) => {
    const id = getId(conversation);

    if (!id) return;

    navigate(`/conversation/${id}`);
  };


  return (
    <div className="triage-page">

      {/* HEADER */}

      <div className="triage-header">

        <div>
          <div className="triage-breadcrumb">
            Assistant Dashboard
            <span>/</span>
            Needs Review
          </div>

          <h1>Needs Review</h1>

          <p>
            Review conversations that need your attention
            before taking further action.
          </p>
        </div>

        <div className="triage-header-count">
          <span>{totalCount.toLocaleString('en-IN')}</span>
          pending reviews
        </div>

      </div>


      {/* REVIEW SUMMARY */}

      <div className="triage-summary">

        <div className="triage-summary-icon">
          <AlertCircle size={20} />
        </div>

        <div>
          <h3>Review queue</h3>
          <p>
            These conversations have been flagged for
            manual review because their classification
            or required action may need verification.
          </p>
        </div>

      </div>


      {/* MAIN PANEL */}

      <section className="triage-panel">

        {/* TOOLBAR */}

        <div className="triage-toolbar">

          <div className="triage-search">

            <Search size={17} />

            <input
              type="text"
              placeholder="Search conversations..."
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
                <X size={15} />
              </button>
            )}

          </div>

          <button
            type="button"
            className="triage-refresh-button"
            onClick={() => fetchTriage(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? 'triage-rotating' : ''}
            />
            Refresh
          </button>

        </div>


        {/* ERROR */}

        {error && (
          <div className="triage-error">
            <AlertCircle size={16} />
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

          <div className="triage-loading">
            <RefreshCw
              size={21}
              className="triage-rotating"
            />
            <span>Loading review queue...</span>
          </div>

        ) : conversations.length > 0 ? (

          /* CONVERSATION LIST */

          <div className="triage-list">

            {conversations.map((conversation) => {
              const id = getId(conversation);
              const date = getDate(conversation);

              return (
                <article
                  className="triage-card"
                  key={id}
                >

                  <div className="triage-card-main">

                    <div className="triage-card-top">

                      <div className="triage-sender">
                        {getSender(conversation)}
                      </div>

                      <div className="triage-date">
                        {date && (
                          <>
                            <Clock3 size={13} />
                            {formatTimeAgo(date)}
                          </>
                        )}
                      </div>

                    </div>


                    <h3 className="triage-subject">
                      {getSubject(conversation)}
                    </h3>


                    <p className="triage-preview">
                      {getPreview(conversation)}
                    </p>


                    <div className="triage-card-meta">

                      <ClassificationChip
                        label={getLabel(conversation)}
                      />

                      {conversation?.accountId && (
                        <span className="triage-account">
                          {typeof conversation.accountId === 'object'
                            ? (
                                conversation.accountId.label ||
                                conversation.accountId.email ||
                                conversation.accountId.address ||
                                'Email account'
                              )
                            : (
                                conversation.accountEmail ||
                                'Email account'
                              )}
                        </span>
                      )}

                    </div>

                  </div>


                  <button
                    type="button"
                    className="triage-open-button"
                    onClick={() => openConversation(conversation)}
                  >
                    Review conversation
                    <ArrowUpRight size={15} />
                  </button>

                </article>
              );
            })}

          </div>

        ) : (

          /* EMPTY STATE */

          <div className="triage-empty">

            <div className="triage-empty-icon">
              <Inbox size={27} />
            </div>

            <h3>No conversations need review</h3>

            <p>
              Your review queue is clear. Conversations
              requiring manual attention will appear here.
            </p>

          </div>

        )}


        {/* PAGINATION */}

        {!loading && conversations.length > 0 && (

          <div className="triage-pagination">

            <span>
              Showing{' '}
              {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}
              {' – '}
              {Math.min(page * PAGE_SIZE, totalCount)}
              {' of '}
              {totalCount}
            </span>

            <div className="triage-pagination-actions">

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

    </div>
  );
}