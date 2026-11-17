import { useNavigate } from 'react-router-dom';

import {
  ArrowLeft,
  Mail,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';

import { useAuth } from '../context.jsx';

import { IconButton } from '../ui/Button.jsx';


/* =========================================================
   CLIENT LAYOUT
========================================================= */

export default function ClientLayout() {
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const ownerName =
    user?.name ||
    user?.ownerName ||
    'Client';

  const initials = ownerName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="client-layout">

      {/* Header */}

      <header className="client-layout-header">

        <div className="client-layout-brand">
          <div className="client-brand-mark">
            <Mail size={19} strokeWidth={2} />
          </div>

          <div className="client-brand-text">
            <span className="client-brand-name">
              AssistFlow
            </span>

            <span className="client-brand-caption">
              Email Workspace
            </span>
          </div>
        </div>

        <div className="client-header-right">

          <span className="client-view-indicator">
            Client View
          </span>

          <div className="client-header-divider" />

          <div className="client-user">
            <span className="client-user-avatar">
              {initials || 'CL'}
            </span>

            <span className="client-user-name">
              {ownerName}
            </span>
          </div>

          <IconButton
            icon={LogOut}
            label="Sign out"
            onClick={logout}
            className="client-logout-button"
          />

        </div>
      </header>


      {/* Main Content */}

      <main className="client-layout-main">

        <div className="client-layout-toolbar">

          <div className="client-layout-heading">
            <h1>Client Inbox</h1>

            <p>
              Conversations that need your attention.
            </p>
          </div>

          <button
            type="button"
            className="client-dashboard-button"
            onClick={() => navigate('/')}
          >
            <LayoutDashboard size={16} />
            Assistant Dashboard
          </button>

        </div>

        <div className="client-layout-content">
          <OutletFallback />
        </div>

      </main>

      {/* Footer */}

      <footer className="client-layout-footer">
        <span>
          AssistFlow · Personal Assistant Workspace
        </span>

        <button
          type="button"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={13} />
          Back to dashboard
        </button>
      </footer>

    </div>
  );
}


/* =========================================================
   ROUTE CONTENT
========================================================= */

import { Outlet } from 'react-router-dom';

function OutletFallback() {
  return <Outlet />;
}