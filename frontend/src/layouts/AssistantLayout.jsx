import { useEffect, useMemo, useState } from 'react';

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  Activity,
  AlertCircle,
  Archive,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  Star,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import {
  useActor,
  useAuth,
  useActiveAccount,
} from '../context.jsx';

import { classNames, getInitials } from '../utils.js';

import { IconButton } from '../ui/Button.jsx';
import { Spinner } from '../ui/Feedback.jsx';


/* =========================================================
   NAVIGATION CONFIGURATION
========================================================= */

const INBOX_SEGMENTS = [
  {
    label: 'Client to Reply',
    value: 'client_to_reply',
    icon: MessageSquare,
  },
  {
    label: 'Assistant to Reply',
    value: 'assistant_to_reply',
    icon: Mail,
  },
  {
    label: 'No Reply Needed',
    value: 'no_reply_needed',
    icon: CheckCircle2,
  },
  {
    label: 'Needs Review',
    value: 'needs_review',
    icon: AlertCircle,
  },
  {
    label: 'Action Required',
    value: 'action_required',
    icon: Activity,
  },
  {
    label: 'Waiting',
    value: 'waiting',
    icon: Clock3,
  },
  {
    label: 'Meetings',
    value: 'meeting',
    icon: CalendarDays,
  },
  {
    label: 'Important',
    value: 'important',
    icon: Star,
  },
  {
    label: 'General',
    value: 'general',
    icon: Inbox,
  },
  {
    label: 'Archived',
    value: 'archived',
    icon: Archive,
  },
];


/* =========================================================
   HELPERS
========================================================= */

function getActorName(actor) {
  return (
    actor?.name ||
    actor?.assistantName ||
    actor?.displayName ||
    'Select your identity'
  );
}

function getActorId(actor) {
  return (
    actor?.actorId ||
    actor?.assistantId ||
    actor?.id ||
    ''
  );
}

function getActorType(actor) {
  return (
    actor?.type ||
    actor?.role ||
    'assistant'
  );
}

function getAccountName(account) {
  if (!account) return 'All accounts';

  return (
    account.label ||
    account.address ||
    account.email ||
    'Connected account'
  );
}


/* =========================================================
   SIDEBAR NAVIGATION ITEM
========================================================= */

function SidebarLink({
  to,
  icon: Icon,
  children,
  collapsed,
  end = false,
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? children : undefined}
      className={({ isActive }) =>
        classNames(
          'assistant-nav-link',
          isActive && 'active',
          collapsed && 'collapsed'
        )
      }
    >
      <Icon size={18} strokeWidth={1.8} />

      {!collapsed && (
        <span>{children}</span>
      )}
    </NavLink>
  );
}


/* =========================================================
   SIDEBAR
========================================================= */

function AssistantSidebar({
  collapsed,
  mobileOpen,
  onClose,
  onToggle,
}) {
  const location = useLocation();

  const isInboxActive =
    location.pathname === '/inbox' ||
    location.pathname.startsWith('/inbox/');

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="assistant-mobile-backdrop"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}

      <aside
        className={classNames(
          'assistant-sidebar',
          collapsed && 'sidebar-collapsed',
          mobileOpen && 'mobile-open'
        )}
      >
        {/* Brand */}

        <div className="assistant-sidebar-brand">
          <div className="assistant-brand-mark">
            <Mail size={20} strokeWidth={2} />
          </div>

          {!collapsed && (
            <div className="assistant-brand-text">
              <span className="assistant-brand-name">
                AssistFlow
              </span>

              <span className="assistant-brand-caption">
                Email Workspace
              </span>
            </div>
          )}

          <button
            type="button"
            className="assistant-sidebar-close mobile-only"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}

        <nav className="assistant-sidebar-nav">

          <div className="assistant-nav-section">
            {!collapsed && (
              <p className="assistant-nav-heading">
                WORKSPACE
              </p>
            )}

            <SidebarLink
              to="/"
              icon={LayoutDashboard}
              collapsed={collapsed}
              end
            >
              Overview
            </SidebarLink>

            <div
              className={classNames(
                'assistant-inbox-group',
                isInboxActive && 'active'
              )}
            >
              <NavLink
                to="/inbox"
                className={({ isActive }) =>
                  classNames(
                    'assistant-nav-link',
                    isActive && 'active',
                    collapsed && 'collapsed'
                  )
                }
                title={collapsed ? 'Inbox' : undefined}
              >
                <Inbox size={18} strokeWidth={1.8} />

                {!collapsed && (
                  <>
                    <span>Inbox</span>
                    <ChevronDown
                      size={15}
                      className="assistant-inbox-chevron"
                    />
                  </>
                )}
              </NavLink>

              {!collapsed && (
                <div className="assistant-segment-list">
                  {INBOX_SEGMENTS.map((segment) => {
                    const Icon = segment.icon;

                    return (
                      <NavLink
                        key={segment.value}
                        to={`/inbox/${segment.value}`}
                        className={({ isActive }) =>
                          classNames(
                            'assistant-segment-link',
                            isActive && 'active'
                          )
                        }
                      >
                        <Icon
                          size={15}
                          strokeWidth={1.8}
                        />

                        <span>{segment.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>

            {collapsed && (
              <SidebarLink
                to="/inbox"
                icon={Inbox}
                collapsed
              >
                Inbox
              </SidebarLink>
            )}

            <SidebarLink
              to="/triage"
              icon={AlertCircle}
              collapsed={collapsed}
            >
              Needs Review
            </SidebarLink>
          </div>

          <div className="assistant-nav-section">
            {!collapsed && (
              <p className="assistant-nav-heading">
                MANAGEMENT
              </p>
            )}

            <SidebarLink
              to="/team"
              icon={Users}
              collapsed={collapsed}
            >
              Team
            </SidebarLink>

            <SidebarLink
              to="/settings"
              icon={Settings}
              collapsed={collapsed}
            >
              Settings
            </SidebarLink>
          </div>
        </nav>

        {/* Sidebar Footer */}

        <div className="assistant-sidebar-footer">
          <button
            type="button"
            className="assistant-help-link"
            title={collapsed ? 'Help & Support' : undefined}
          >
            <CircleHelp size={18} strokeWidth={1.8} />

            {!collapsed && (
              <span>Help & Support</span>
            )}
          </button>

          <button
            type="button"
            className="assistant-collapse-button"
            onClick={onToggle}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}

            {!collapsed && (
              <span>Collapse sidebar</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}


/* =========================================================
   ACCOUNT SWITCHER
========================================================= */

function AccountSwitcher() {
  const {
    activeAccount,
    activeAccountId,
    setActiveAccount,
  } = useActiveAccount();

  const [open, setOpen] = useState(false);

  const selectedName = getAccountName(activeAccount);

  return (
    <div className="assistant-account-switcher">
      <button
        type="button"
        className="assistant-account-trigger"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Mail size={16} />

        <span className="assistant-account-name">
          {selectedName}
        </span>

        <ChevronDown size={14} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="assistant-dropdown-backdrop"
            aria-label="Close account menu"
            onClick={() => setOpen(false)}
          />

          <div className="assistant-dropdown-menu account-menu">
            <p className="assistant-dropdown-heading">
              EMAIL ACCOUNTS
            </p>

            <button
              type="button"
              className={classNames(
                'assistant-dropdown-item',
                !activeAccountId && 'selected'
              )}
              onClick={() => {
                setActiveAccount(null);
                setOpen(false);
              }}
            >
              <Inbox size={16} />
              <span>All accounts</span>

              {!activeAccountId && (
                <CheckCircle2 size={15} />
              )}
            </button>

            {activeAccount && (
              <button
                type="button"
                className="assistant-dropdown-item selected"
                onClick={() => setOpen(false)}
              >
                <Mail size={16} />

                <span>
                  {getAccountName(activeAccount)}
                </span>

                <CheckCircle2 size={15} />
              </button>
            )}

            {!activeAccount && (
              <p className="assistant-account-hint">
                Select an account from Settings after connecting it.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}


/* =========================================================
   ACTOR SELECTOR
========================================================= */

function ActorSelector({
  actor,
  setActor,
  assistants,
  user,
}) {
  const [open, setOpen] = useState(false);

  const actorName = getActorName(actor);
  const actorId = getActorId(actor);

  const ownerName =
    user?.name ||
    user?.ownerName ||
    'Owner';

  const ownerOption = {
    type: 'owner',
    actorId: 'OWN-001',
    name: ownerName,
  };

  const actorOptions = useMemo(() => {
    const normalizedAssistants = Array.isArray(assistants)
      ? assistants.map((assistant) => ({
          ...assistant,
          type: 'assistant',
          actorId:
            assistant.actorId ||
            assistant.assistantId ||
            assistant.id,
          name:
            assistant.name ||
            assistant.assistantName,
        }))
      : [];

    return [
      ownerOption,
      ...normalizedAssistants,
    ];
  }, [assistants, ownerName]);

  const handleSelect = (selectedActor) => {
    setActor(selectedActor);
    setOpen(false);
  };

  return (
    <div className="assistant-actor-selector">
      <button
        type="button"
        className="assistant-actor-trigger"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="assistant-avatar">
          {getInitials(actorName)}
        </span>

        <span className="assistant-actor-info">
          <span className="assistant-actor-label">
            Working as
          </span>

          <span className="assistant-actor-name">
            {actorName}
          </span>
        </span>

        <ChevronDown size={15} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="assistant-dropdown-backdrop"
            aria-label="Close actor menu"
            onClick={() => setOpen(false)}
          />

          <div className="assistant-dropdown-menu actor-menu">
            <p className="assistant-dropdown-heading">
              WHO IS WORKING?
            </p>

            {actorOptions.map((option) => {
              const selected =
                getActorId(option) === actorId;

              return (
                <button
                  key={getActorId(option)}
                  type="button"
                  className={classNames(
                    'assistant-actor-option',
                    selected && 'selected'
                  )}
                  onClick={() => handleSelect(option)}
                >
                  <span className="assistant-avatar small">
                    {getInitials(option.name)}
                  </span>

                  <span className="assistant-actor-option-info">
                    <span>{option.name}</span>

                    <small>
                      {option.type === 'owner'
                        ? 'Owner'
                        : option.actorId}
                    </small>
                  </span>

                  {selected && (
                    <CheckCircle2 size={16} />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


/* =========================================================
   TOPBAR
========================================================= */

function AssistantTopbar({
  onMenuClick,
}) {
  const navigate = useNavigate();

  const {
    actor,
    setActor,
    assistants,
  } = useActor();

  const { user, logout } = useAuth();

  const [search, setSearch] = useState('');

  const handleSearch = (event) => {
    event.preventDefault();

    const query = search.trim();

    if (!query) return;

    navigate(`/inbox?q=${encodeURIComponent(query)}`);
  };

  const openAskAI = () => {
    window.dispatchEvent(
      new CustomEvent('assistant:open-ask-ai')
    );
  };

  const openNotifications = () => {
    window.dispatchEvent(
      new CustomEvent('assistant:open-notifications')
    );
  };

  return (
    <header className="assistant-topbar">

      <div className="assistant-topbar-left">
        <IconButton
          icon={Menu}
          label="Open navigation"
          className="assistant-mobile-menu-button"
          onClick={onMenuClick}
        />

        <form
          className="assistant-search"
          onSubmit={handleSearch}
        >
          <Search size={17} />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search emails, people..."
            aria-label="Search emails"
          />

          <kbd>⌘ K</kbd>
        </form>
      </div>

      <div className="assistant-topbar-right">

        <AccountSwitcher />

        <button
          type="button"
          className="assistant-ask-ai-button"
          onClick={openAskAI}
        >
          <Sparkles size={16} />
          <span>Ask AI</span>
        </button>

        <IconButton
          icon={Bell}
          label="Notifications"
          onClick={openNotifications}
          className="assistant-notification-button"
        />

        <div className="assistant-topbar-divider" />

        <ActorSelector
          actor={actor}
          setActor={setActor}
          assistants={assistants}
          user={user}
        />

        <button
          type="button"
          className="assistant-client-view-button"
          onClick={() => navigate('/client')}
        >
          Client View
          <ChevronRight size={15} />
        </button>

        <IconButton
          icon={LogOut}
          label="Sign out"
          onClick={logout}
          className="assistant-logout-button"
        />
      </div>
    </header>
  );
}


/* =========================================================
   ASSISTANT LAYOUT
========================================================= */

export default function AssistantLayout() {
  const {
    actor,
    isActorSelected,
    setActor,
  } = useActor();

  const { user, loading } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, []);

  if (loading) {
    return (
      <div className="assistant-layout-loading">
        <Spinner label="Loading workspace..." />
      </div>
    );
  }

  const needsActorSelection = !isActorSelected;

  const assistants = Array.isArray(user?.assistants)
    ? user.assistants
    : [];

  const handleActorSelection = (selectedActor) => {
    setActor(selectedActor);
  };

  return (
    <div className="assistant-layout">

      <AssistantSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggle={() => setCollapsed((current) => !current)}
      />

      <div
        className={classNames(
          'assistant-main',
          collapsed && 'assistant-main-expanded'
        )}
      >
        <AssistantTopbar
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className="assistant-page-content">
          <Outlet />
        </main>
      </div>

      {/* Who is working popup */}

      {needsActorSelection && (
        <div className="assistant-actor-overlay">
          <div
            className="assistant-actor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="actor-modal-title"
          >
            <div className="assistant-actor-modal-icon">
              <Users size={23} />
            </div>

            <h2 id="actor-modal-title">
              Who is working?
            </h2>

            <p>
              Select your identity to continue. Your
              activity will be recorded under this identity.
            </p>

            <div className="assistant-actor-modal-options">

              <button
                type="button"
                className="assistant-actor-modal-option"
                onClick={() =>
                  handleActorSelection({
                    type: 'owner',
                    actorId: 'OWN-001',
                    name:
                      user?.name ||
                      user?.ownerName ||
                      'Owner',
                  })
                }
              >
                <span className="assistant-avatar">
                  {getInitials(
                    user?.name ||
                    user?.ownerName ||
                    'Owner'
                  )}
                </span>

                <span>
                  <strong>
                    {user?.name ||
                      user?.ownerName ||
                      'Owner'}
                  </strong>

                  <small>Owner · OWN-001</small>
                </span>

                <ChevronRight size={17} />
              </button>

              {assistants.map((assistant) => {
                const assistantId =
                  assistant.assistantId ||
                  assistant.actorId ||
                  assistant.id;

                return (
                  <button
                    key={assistantId}
                    type="button"
                    className="assistant-actor-modal-option"
                    onClick={() =>
                      handleActorSelection({
                        ...assistant,
                        type: 'assistant',
                        actorId: assistantId,
                        name: assistant.name,
                      })
                    }
                  >
                    <span className="assistant-avatar">
                      {getInitials(assistant.name)}
                    </span>

                    <span>
                      <strong>{assistant.name}</strong>

                      <small>
                        Assistant · {assistantId}
                      </small>
                    </span>

                    <ChevronRight size={17} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}