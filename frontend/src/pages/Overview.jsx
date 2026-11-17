import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Inbox,
  Mail,
  Star,
  AlertCircle,
  Clock3,
  UserCheck,
  Users,
  Search,
  CalendarDays,
  ArrowRight,
  RefreshCw,
  ChevronRight,
  Activity,
  CheckCircle2,
  Filter,
  X,
} from 'lucide-react';

import { dashboardAPI } from '../api.js';
import { formatDate, formatTimeAgo, getInitials } from '../utils.js';


/* =========================================================
   HELPERS
========================================================= */

const getArray = (...values) => {
  return values.find(Array.isArray) || [];
};


const getNumber = (...values) => {
  for (const value of values) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return 0;
};


const getLabel = (value = '') => {
  const labels = {
    client_to_reply: 'Client to Reply',
    assistant_to_reply: 'Assistant to Reply',
    no_reply_needed: 'No Reply Needed',
    needs_review: 'Needs Review',
    action_required: 'Action Required',
    waiting: 'Waiting',
    meeting: 'Meeting',
    meetings: 'Meetings',
    important: 'Important',
    general: 'General',
    archived: 'Archived',
  };

  return labels[value] || value || 'General';
};


const getStatusClass = (value = '') => {
  const normalized = value.toLowerCase().replaceAll(' ', '_');

  const classes = {
    client_to_reply: 'client',
    assistant_to_reply: 'assistant',
    no_reply_needed: 'neutral',
    needs_review: 'review',
    action_required: 'action',
    waiting: 'waiting',
    meeting: 'meeting',
    meetings: 'meeting',
    important: 'important',
    general: 'neutral',
  };

  return classes[normalized] || 'neutral';
};


const getSender = (conversation) => {
  return (
    conversation?.fromName ||
    conversation?.messages?.at(-1)?.from?.name ||
    conversation?.messages?.at(-1)?.fromName ||
    conversation?.fromEmail ||
    'Unknown sender'
  );
};


const getAccountName = (conversation) => {
  return (
    conversation?.accountId?.label ||
    conversation?.accountId?.address ||
    conversation?.accountId?.email ||
    'Email account'
  );
};


const getSubject = (conversation) => {
  return conversation?.subject || '(No subject)';
};


const getConversationId = (conversation) => {
  return conversation?._id || conversation?.id;
};


const getConversationSummary = (conversation) => {
  return (
    conversation?.summary?.text ||
    conversation?.snippet ||
    'No summary available.'
  );
};


/* =========================================================
   STATISTIC CARD
========================================================= */

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  type = 'default',
  onClick,
}) {
  return (
    <button
      type="button"
      className={`overview-stat-card ${type}`}
      onClick={onClick}
    >
      <div className="overview-stat-top">

        <span className="overview-stat-title">
          {title}
        </span>

        <span className="overview-stat-icon">
          <Icon size={18} />
        </span>

      </div>

      <div className="overview-stat-value">
        {value.toLocaleString('en-IN')}
      </div>

      <div className="overview-stat-description">
        {description}
      </div>
    </button>
  );
}


/* =========================================================
   CONVERSATION ROW
========================================================= */

function RecentConversation({ conversation, onClick }) {
  const label = getLabel(
    conversation.label || conversation.aiLabel
  );

  const sender = getSender(conversation);

  const date =
    conversation.lastMessageAt ||
    conversation.updatedAt ||
    conversation.createdAt;

  return (
    <button
      type="button"
      className="overview-conversation-row"
      onClick={onClick}
    >

      <div className="overview-sender-avatar">
        {getInitials(sender)}
      </div>

      <div className="overview-conversation-main">

        <div className="overview-conversation-heading">

          <strong>{sender}</strong>

          <span className="overview-conversation-date">
            {date ? formatTimeAgo(date) : ''}
          </span>

        </div>

        <h4>{getSubject(conversation)}</h4>

        <p>{getConversationSummary(conversation)}</p>

        <div className="overview-conversation-meta">

          <span
            className={`overview-label-chip ${getStatusClass(label)}`}
          >
            {label}
          </span>

          <span className="overview-account-label">
            <Mail size={12} />
            {getAccountName(conversation)}
          </span>

          {conversation.assignedTo?.name && (
            <span className="overview-assignee">
              <UserCheck size={12} />
              {conversation.assignedTo.name}
            </span>
          )}

        </div>

      </div>

      <ChevronRight
        size={17}
        className="overview-row-chevron"
      />

    </button>
  );
}


/* =========================================================
   ACTIVITY ITEM
========================================================= */

function ActivityItem({ activity }) {
  const actorName =
    activity.actor?.name || 'Team member';

  const subject =
    activity.conversationId?.subject ||
    'a conversation';

  const actionLabels = {
    classified: 'classified',
    replied: 'replied to',
    assigned: 'updated assignment for',
    updated: 'updated',
    archived: 'archived',
    completed: 'completed',
    marked_read: 'marked as read',
  };

  const action =
    actionLabels[activity.action] ||
    String(activity.action || 'updated').replaceAll('_', ' ');

  return (
    <div className="overview-activity-item">

      <div className="overview-activity-avatar">
        {getInitials(actorName)}
      </div>

      <div className="overview-activity-content">

        <p>
          <strong>{actorName}</strong>{' '}
          {action}{' '}
          <span>{subject}</span>
        </p>

        <span className="overview-activity-time">
          {activity.createdAt
            ? formatTimeAgo(activity.createdAt)
            : ''}
        </span>

      </div>

    </div>
  );
}


/* =========================================================
   OVERVIEW PAGE
========================================================= */

export default function Overview() {
  const navigate = useNavigate();

  const [overview, setOverview] = useState({});
  const [stats, setStats] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedLabel, setSelectedLabel] = useState('all');

  const [refreshing, setRefreshing] = useState(false);


  /* =====================================================
     FETCH DASHBOARD DATA
  ===================================================== */

  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const [overviewResponse, statsResponse] =
        await Promise.all([
          dashboardAPI.getOverview(),
          dashboardAPI.getStats(),
        ]);

      setOverview(
        overviewResponse?.data ||
        overviewResponse ||
        {}
      );

      setStats(
        statsResponse?.data ||
        statsResponse ||
        {}
      );

    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load dashboard data.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    fetchDashboard();
  }, []);


  /* =====================================================
     NORMALIZE DATA
  ===================================================== */

  const conversations = useMemo(() => {
    return getArray(
      overview.conversations,
      overview.recentConversations,
      overview.data?.conversations,
      overview.data?.recentConversations
    );
  }, [overview]);


  const recentActivity = useMemo(() => {
    return getArray(
      overview.recentActivity,
      overview.activity,
      stats.recentActivity,
      overview.data?.recentActivity
    );
  }, [overview, stats]);


  const upcomingMeetings = useMemo(() => {
    return getArray(
      overview.upcomingMeetings,
      overview.meetings,
      stats.upcomingMeetings,
      overview.data?.upcomingMeetings
    );
  }, [overview, stats]);


  const accounts = useMemo(() => {
    const accountMap = new Map();

    conversations.forEach((conversation) => {
      const account = conversation.accountId;

      if (account && typeof account === 'object') {
        const id = account._id || account.id;

        if (id) {
          accountMap.set(id, account);
        }
      }
    });

    return Array.from(accountMap.values());
  }, [conversations]);


  /* =====================================================
     STATISTICS
  ===================================================== */

  const totalConversations = getNumber(
    stats.totalConversations,
    stats.total,
    overview.totalConversations,
    overview.total,
    stats.counts?.total,
    conversations.length
  );

  const unreadCount = getNumber(
    stats.unread,
    stats.unreadCount,
    stats.counts?.unread,
    overview.unread,
    overview.unreadCount,
    conversations.filter((item) => item.isUnread).length
  );

  const importantCount = getNumber(
    stats.important,
    stats.importantCount,
    stats.counts?.important,
    overview.important,
    conversations.filter((item) => item.isStarred).length
  );

  const actionRequiredCount = getNumber(
    stats.actionRequired,
    stats.actionRequiredCount,
    stats.counts?.actionRequired,
    overview.actionRequired,
    conversations.filter(
      (item) => item.label === 'action_required'
    ).length
  );

  const waitingCount = getNumber(
    stats.waiting,
    stats.waitingCount,
    stats.counts?.waiting,
    overview.waiting,
    conversations.filter(
      (item) => item.label === 'waiting'
    ).length
  );

  const assignedCount = getNumber(
    stats.assignedToMe,
    stats.assigned,
    stats.assignedCount,
    stats.counts?.assignedToMe,
    overview.assignedToMe
  );

  const clientAttentionCount = getNumber(
    stats.clientAttention,
    stats.clientAttentionCount,
    stats.counts?.clientAttention,
    overview.clientAttention,
    conversations.filter(
      (item) => item.label === 'client_to_reply'
    ).length
  );


  /* =====================================================
     FILTER CONVERSATIONS
  ===================================================== */

  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    if (search.trim()) {
      const query = search.toLowerCase();

      result = result.filter((conversation) => {
        const searchable = [
          conversation.subject,
          conversation.fromName,
          conversation.fromEmail,
          conversation.snippet,
          conversation.summary?.text,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchable.includes(query);
      });
    }

    if (selectedAccount !== 'all') {
      result = result.filter(
        (conversation) =>
          conversation.accountId?._id === selectedAccount ||
          conversation.accountId?.id === selectedAccount
      );
    }

    if (selectedLabel !== 'all') {
      result = result.filter(
        (conversation) =>
          (conversation.label || conversation.aiLabel) === selectedLabel
      );
    }

    return result
      .sort((a, b) => {
        const dateA = new Date(
          a.lastMessageAt || a.updatedAt || a.createdAt || 0
        ).getTime();

        const dateB = new Date(
          b.lastMessageAt || b.updatedAt || b.createdAt || 0
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 6);

  }, [
    conversations,
    search,
    selectedAccount,
    selectedLabel,
  ]);


  /* =====================================================
     RENDER
  ===================================================== */

  if (loading) {
    return (
      <div className="overview-loading">
        <RefreshCw size={22} className="overview-loading-icon" />
        <span>Loading your dashboard...</span>
      </div>
    );
  }


  if (error && !Object.keys(overview).length) {
    return (
      <div className="overview-error">

        <div className="overview-error-icon">
          <AlertCircle size={24} />
        </div>

        <h2>Unable to load dashboard</h2>

        <p>{error}</p>

        <button
          type="button"
          onClick={() => fetchDashboard()}
        >
          <RefreshCw size={15} />
          Try again
        </button>

      </div>
    );
  }


  return (
    <div className="overview-page">

      {/* PAGE HEADER */}

      <div className="overview-page-header">

        <div>
          <span className="overview-eyebrow">
            WORKSPACE OVERVIEW
          </span>

          <h1>Overview</h1>

          <p>
            A summary of your conversations and team activity.
          </p>
        </div>

        <button
          type="button"
          className="overview-refresh-button"
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={15}
            className={refreshing ? 'overview-rotating' : ''}
          />

          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>

      </div>


      {/* STAT CARDS */}

      <section className="overview-stats-grid">

        <StatCard
          title="Total Conversations"
          value={totalConversations}
          description="All conversations"
          icon={Inbox}
          onClick={() => navigate('/inbox')}
        />

        <StatCard
          title="Unread"
          value={unreadCount}
          description="Awaiting attention"
          icon={Mail}
          type="blue"
          onClick={() => navigate('/inbox?filter=unread')}
        />

        <StatCard
          title="Important"
          value={importantCount}
          description="Starred conversations"
          icon={Star}
          type="yellow"
          onClick={() => navigate('/inbox?filter=important')}
        />

        <StatCard
          title="Action Required"
          value={actionRequiredCount}
          description="Tasks requiring action"
          icon={AlertCircle}
          type="orange"
          onClick={() => navigate('/inbox/action_required')}
        />

        <StatCard
          title="Waiting"
          value={waitingCount}
          description="Awaiting a response"
          icon={Clock3}
          type="gray"
          onClick={() => navigate('/inbox/waiting')}
        />

        <StatCard
          title="Assigned to Me"
          value={assignedCount}
          description="Conversations assigned to you"
          icon={UserCheck}
          type="green"
          onClick={() => navigate('/inbox?filter=assigned')}
        />

        <StatCard
          title="Client Attention"
          value={clientAttentionCount}
          description="Waiting for client response"
          icon={Users}
          type="blue"
          onClick={() => navigate('/inbox/client_to_reply')}
        />

      </section>


      {/* MAIN DASHBOARD GRID */}

      <div className="overview-content-grid">

        {/* RECENT CONVERSATIONS */}

        <section className="overview-panel overview-recent-panel">

          <div className="overview-panel-header">

            <div>
              <h2>Recent conversations</h2>

              <p>
                Latest activity across your inbox.
              </p>
            </div>

            <button
              type="button"
              className="overview-view-all"
              onClick={() => navigate('/inbox')}
            >
              View all
              <ArrowRight size={15} />
            </button>

          </div>


          {/* SEARCH AND FILTERS */}

          <div className="overview-filters">

            <div className="overview-search">

              <Search size={16} />

              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}

            </div>


            <div className="overview-filter-select">

              <Filter size={14} />

              <select
                value={selectedAccount}
                onChange={(event) =>
                  setSelectedAccount(event.target.value)
                }
                aria-label="Filter by account"
              >
                <option value="all">All accounts</option>

                {accounts.map((account) => (
                  <option
                    key={account._id || account.id}
                    value={account._id || account.id}
                  >
                    {account.label ||
                      account.address ||
                      account.email}
                  </option>
                ))}

              </select>

            </div>


            <div className="overview-filter-select">

              <select
                value={selectedLabel}
                onChange={(event) =>
                  setSelectedLabel(event.target.value)
                }
                aria-label="Filter by classification"
              >
                <option value="all">All labels</option>
                <option value="client_to_reply">Client to Reply</option>
                <option value="assistant_to_reply">Assistant to Reply</option>
                <option value="no_reply_needed">No Reply Needed</option>
                <option value="needs_review">Needs Review</option>
                <option value="action_required">Action Required</option>
                <option value="waiting">Waiting</option>
                <option value="important">Important</option>
              </select>

            </div>

          </div>


          {/* CONVERSATION LIST */}

          {filteredConversations.length > 0 ? (

            <div className="overview-conversation-list">

              {filteredConversations.map((conversation) => (

                <RecentConversation
                  key={getConversationId(conversation)}
                  conversation={conversation}
                  onClick={() =>
                    navigate(
                      `/inbox/${getConversationId(conversation)}`
                    )
                  }
                />

              ))}

            </div>

          ) : (

            <div className="overview-empty">

              <Inbox size={25} />

              <strong>No conversations found</strong>

              <span>
                Try changing your search or filters.
              </span>

            </div>

          )}

        </section>


        {/* RIGHT COLUMN */}

        <div className="overview-side-column">

          {/* UPCOMING MEETINGS */}

          <section className="overview-panel">

            <div className="overview-panel-header">

              <div>
                <h2>Upcoming meetings</h2>

                <p>
                  Scheduled conversations.
                </p>
              </div>

              <CalendarDays
                size={18}
                className="overview-panel-icon"
              />

            </div>


            {upcomingMeetings.length > 0 ? (

              <div className="overview-meetings-list">

                {upcomingMeetings.slice(0, 4).map((meeting, index) => {

                  const meetingDate =
                    meeting.startAt ||
                    meeting.date ||
                    meeting.startTime;

                  return (
                    <div
                      className="overview-meeting-item"
                      key={meeting._id || meeting.id || index}
                    >

                      <div className="overview-meeting-date">

                        <strong>
                          {meetingDate
                            ? new Date(meetingDate).getDate()
                            : '--'}
                        </strong>

                        <span>
                          {meetingDate
                            ? new Date(meetingDate).toLocaleDateString(
                                'en-IN',
                                { month: 'short' }
                              )
                            : 'Date'}
                        </span>

                      </div>

                      <div className="overview-meeting-info">

                        <strong>
                          {meeting.title ||
                            meeting.subject ||
                            'Scheduled meeting'}
                        </strong>

                        <span>
                          {meetingDate
                            ? new Date(meetingDate).toLocaleTimeString(
                                'en-IN',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )
                            : 'Time not specified'}
                        </span>

                      </div>

                    </div>
                  );
                })}

              </div>

            ) : (

              <div className="overview-meeting-empty">
                <CalendarDays size={21} />

                <span>No upcoming meetings available.</span>
              </div>

            )}

          </section>


          {/* RECENT ACTIVITY */}

          <section className="overview-panel">

            <div className="overview-panel-header">

              <div>
                <h2>Recent activity</h2>

                <p>
                  Latest team updates.
                </p>
              </div>

              <Activity
                size={18}
                className="overview-panel-icon"
              />

            </div>


            {recentActivity.length > 0 ? (

              <div className="overview-activity-list">

                {recentActivity.slice(0, 5).map((activity) => (

                  <ActivityItem
                    key={activity._id}
                    activity={activity}
                  />

                ))}

              </div>

            ) : (

              <div className="overview-activity-empty">
                <CheckCircle2 size={20} />

                <span>No recent activity.</span>
              </div>

            )}

          </section>

        </div>

      </div>


      {/* FOOTER */}

      <div className="overview-footer">
        <span>
          <CheckCircle2 size={14} />
          Dashboard data loaded
        </span>

        <button
          type="button"
          onClick={() => navigate('/inbox')}
        >
          Open inbox
          <ArrowRight size={14} />
        </button>
      </div>

    </div>
  );
}