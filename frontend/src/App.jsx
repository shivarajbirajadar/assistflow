import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import {
  AuthProvider,
  ActorProvider,
  ActiveAccountProvider,
  ToastProvider,
  useAuth,
} from './context.jsx';

import AssistantLayout from './layouts/AssistantLayout.jsx';
import ClientLayout from './layouts/ClientLayout.jsx';

import Login from './pages/Login.jsx';
import Connect from './pages/Connect.jsx';
import Overview from './pages/Overview.jsx';
import Inbox from './pages/Inbox.jsx';
import Conversation from './pages/Conversation.jsx';
import Triage from './pages/Triage.jsx';
import Team from './pages/Team.jsx';
import Settings from './pages/Settings.jsx';
import ClientView from './pages/ClientView.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading" role="status">
        Loading dashboard...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/connect"
        element={
          <ProtectedRoute>
            <Connect />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AssistantLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Overview />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/inbox/:segment" element={<Inbox />} />
        <Route path="/conversation/:id" element={<Conversation />} />
        <Route path="/triage" element={<Triage />} />
        <Route path="/team" element={<Team />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route
        path="/client"
        element={
          <ProtectedRoute>
            <ClientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientView />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ActorProvider>
          <ActiveAccountProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </ActiveAccountProvider>
        </ActorProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}