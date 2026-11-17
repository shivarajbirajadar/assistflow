import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Users,
  RefreshCw,
  Mail,
  MessageSquare,
  Activity,
  Clock3,
  Search,
  UserCheck,
  AlertCircle,
  X,
} from 'lucide-react';

import { dashboardAPI } from '../api.js';
import { formatTimeAgo, getInitials } from '../utils.js';


const getResponseData = (response) => {
  const payload = response?.data ?? response ?? {};

  return payload?.data &&
    typeof payload.data === 'object'
    ? payload.data
    : payload;
};


const getActor = (activity) => {
  return (
    activity?.actor ||
    activity?.performedBy ||
    activity?.user ||
    activity?.assistant ||
    activity?.performedByName ||
    null
  );
};


const getActorName = (actor) => {
  if (typeof actor === 'string') return actor;

  return (
    actor?.name ||
    actor?.fullName ||
    actor?.email ||
    'Team member'
  );
};


const getActorId = (actor) => {
  if (typeof actor === 'string') return '';

  return (
    actor?.employeeId ||
    actor?.actorId ||
    actor?.assistantId ||
    actor?.id ||
    ''
  );
};


const getActivityType = (activity) => {
  return String(
    activity?.action ||
    activity?.type ||
    activity?.event ||
    'activity'
  ).toLowerCase();
};


const getActivityDescription = (activity) => {
  return (
    activity?.description ||
    activity?.message ||
    activity?.details ||
    activity?.actionDescription ||
    'Updated a conversation'
  );
};


const getActivityDate = (activity) => {
  return (
    activity?.createdAt ||
    activity?.timestamp ||
    activity?.date ||
    null
  );
};


const isReplyActivity = (activity) => {
  const type = getActivityType(activity);

  return (
    type.includes('reply') ||
    type.includes('respond')
  );
};


const isHandledActivity = (activity) => {
  const type = getActivityType(activity);

  return (
    type.includes('handle') ||
    type.includes('assign') ||
    type.includes('takeover')
  );
};


export default function Team() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');


  const fetchTeamActivity = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const response = await dashboardAPI.getActivity({
        page: 1,
        limit: 100,
      });

      const data = getResponseData(response);

      const items = [
        data?.activities,
        data?.activity,
        data?.items,
        data?.results,
      ].find(Array.isArray) || [];

      setActivities(items);

    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load team activity.'
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  useEffect(() => {
    fetchTeamActivity();
  }, [fetchTeamActivity]);


  const teamMembers = useMemo(() => {
    const members = new Map();

    activities.forEach((activity) => {
      const actor = getActor(activity);

      if (!actor) return;

      const name = getActorName(actor);
      const actorId = getActorId(actor);
      const key = actorId || name;

      if (!members.has(key)) {
        members.set(key, {
          id: key,
          name,
          employeeId: actorId,
          handled: 0,
          replies: 0,
          activities: 0,
          latestActivity: null,
        });
      }

      const member = members.get(key);

      member.activities += 1;

      if (isHandledActivity(activity)) {
        member.handled += 1;
      }

      if (isReplyActivity(activity)) {
        member.replies += 1;
      }

      const date = getActivityDate(activity);

      if (
        date &&
        (
          !member.latestActivity ||
          new Date(date) > new Date(member.latestActivity)
        )
      ) {
        member.latestActivity = date;
      }
    });

    return Array.from(members.values()).sort(
      (a, b) => b.activities - a.activities
    );
  }, [activities]);


  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return teamMembers;

    return teamMembers.filter((member) => {
      return (
        member.name.toLowerCase().includes(query) ||
        member.employeeId.toLowerCase().includes(query)
      );
    });
  }, [teamMembers, search]);


  const totalHandled = teamMembers.reduce(
    (total, member) => total + member.handled,
    0
  );

  const totalReplies = teamMembers.reduce(
    (total, member) => total + member.replies,
    0
  );


  return (
    <div className="team-page">

      {/* HEADER */}

      <div className="team-header">

        <div>
          <div className="team-breadcrumb">
            Assistant Dashboard
            <span>/</span>
            Team
          </div>

          <h1>Team</h1>

          <p>
            Monitor team contributions and recent activity.
          </p>
        </div>

        <button
          type="button"
          className="team-refresh-button"
          onClick={() => fetchTeamActivity(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={15}
            className={refreshing ? 'team-rotating' : ''}
          />
          Refresh
        </button>

      </div>


      {/* STATISTICS */}

      <div className="team-stats-grid">

        <div className="team-stat-card">
          <div className="team-stat-icon">
            <Users size={19} />
          </div>

          <span>Team members</span>
          <strong>{teamMembers.length}</strong>
        </div>


        <div className="team-stat-card">
          <div className="team-stat-icon">
            <Mail size={19} />
          </div>

          <span>Conversations handled</span>
          <strong>{totalHandled}</strong>
        </div>


        <div className="team-stat-card">
          <div className="team-stat-icon">
            <MessageSquare size={19} />
          </div>

          <span>Replies sent</span>
          <strong>{totalReplies}</strong>
        </div>


        <div className="team-stat-card">
          <div className="team-stat-icon">
            <Activity size={19} />
          </div>

          <span>Recorded activities</span>
          <strong>{activities.length}</strong>
        </div>

      </div>


      {/* ERROR */}

      {error && (
        <div className="team-error">
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


      {/* TEAM MEMBERS */}

      <section className="team-section">

        <div className="team-section-header">

          <div>
            <h2>Team members</h2>
            <p>
              Activity recorded for each team member.
            </p>
          </div>

          <div className="team-search">

            <Search size={16} />

            <input
              type="text"
              placeholder="Search team members..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

          </div>

        </div>


        {loading ? (

          <div className="team-loading">
            <RefreshCw
              size={20}
              className="team-rotating"
            />
            Loading team activity...
          </div>

        ) : filteredMembers.length > 0 ? (

          <div className="team-members-list">

            {filteredMembers.map((member) => (

              <div
                className="team-member-card"
                key={member.id}
              >

                <div className="team-member-identity">

                  <div className="team-avatar">
                    {getInitials(member.name)}
                  </div>

                  <div>
                    <h3>{member.name}</h3>

                    <span>
                      {member.employeeId || 'Team member'}
                    </span>
                  </div>

                </div>


                <div className="team-member-metrics">

                  <div>
                    <strong>{member.handled}</strong>
                    <span>Handled</span>
                  </div>

                  <div>
                    <strong>{member.replies}</strong>
                    <span>Replies</span>
                  </div>

                  <div>
                    <strong>{member.activities}</strong>
                    <span>Activities</span>
                  </div>

                </div>


                <div className="team-member-last-active">

                  <Clock3 size={14} />

                  <span>
                    {member.latestActivity
                      ? formatTimeAgo(member.latestActivity)
                      : 'No recent activity'}
                  </span>

                </div>

              </div>

            ))}

          </div>

        ) : (

          <div className="team-empty">

            <div className="team-empty-icon">
              <Users size={26} />
            </div>

            <h3>
              {search
                ? 'No team members found'
                : 'No team activity available'}
            </h3>

            <p>
              {search
                ? 'Try searching with a different name or ID.'
                : 'Team member information will appear here when activity is recorded.'}
            </p>

          </div>

        )}

      </section>


      {/* RECENT ACTIVITY */}

      <section className="team-section team-activity-section">

        <div className="team-section-header">

          <div>
            <h2>Recent activity</h2>
            <p>
              Latest changes made across conversations.
            </p>
          </div>

          <span className="team-activity-count">
            {activities.length} records
          </span>

        </div>


        {!loading && activities.length > 0 ? (

          <div className="team-activity-list">

            {activities.slice(0, 20).map((activity, index) => {
              const actor = getActor(activity);
              const actorName = actor
                ? getActorName(actor)
                : 'System';

              const date = getActivityDate(activity);

              return (
                <div
                  className="team-activity-item"
                  key={activity?._id || activity?.id || index}
                >

                  <div className="team-activity-icon">
                    {isReplyActivity(activity)
                      ? <MessageSquare size={16} />
                      : isHandledActivity(activity)
                        ? <UserCheck size={16} />
                        : <Activity size={16} />}
                  </div>


                  <div className="team-activity-content">

                    <p>
                      <strong>{actorName}</strong>
                      {' '}
                      {getActivityDescription(activity)}
                    </p>

                    {activity?.conversationId?.subject && (
                      <span>
                        {activity.conversationId.subject}
                      </span>
                    )}

                  </div>


                  <time>
                    {date ? formatTimeAgo(date) : ''}
                  </time>

                </div>
              );
            })}

          </div>

        ) : !loading ? (

          <div className="team-activity-empty">
            No recent activity recorded.
          </div>

        ) : null}

      </section>

    </div>
  );
}