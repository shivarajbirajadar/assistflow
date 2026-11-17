import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach authentication and active actor to every request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const actorId = localStorage.getItem('actorId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (actorId) {
    config.headers['x-actor-id'] = actorId;
  }

  return config;
});

// ---------- Authentication Context ----------

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('actorId');
    localStorage.removeItem('actorName');

    setUser(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    const data = response.data?.data ?? response.data;

    const token = data.token || data.accessToken;
    const authenticatedUser = data.user;

    if (!token || !authenticatedUser) {
      throw new Error('Invalid login response from server.');
    }

    localStorage.setItem('token', token);
    setUser(authenticatedUser);

    return authenticatedUser;
  }, []);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        if (active) {
          setLoading(false);
        }

        return;
      }

      try {
        const response = await apiClient.get('/auth/me');
        const data = response.data?.data ?? response.data;

        if (active) {
          setUser(data.user ?? data);
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('actorId');
        localStorage.removeItem('actorName');

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      setUser,
    }),
    [user, loading, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}

// ---------- Actor Context ----------

const ActorContext = createContext(null);

export function ActorProvider({ children }) {
  const { user } = useAuth();

  const [actor, setActorState] = useState(() => ({
    actorId: localStorage.getItem('actorId') || '',
    name: localStorage.getItem('actorName') || '',
    type: '',
  }));

  // Always provide a valid and stable assistants array.
  const assistants = useMemo(
    () => (
      Array.isArray(user?.assistants)
        ? user.assistants
        : []
    ),
    [user?.assistants]
  );

  const setActor = useCallback((nextActor) => {
    if (!nextActor?.actorId || !nextActor?.name) {
      return;
    }

    localStorage.setItem('actorId', nextActor.actorId);
    localStorage.setItem('actorName', nextActor.name);

    setActorState(nextActor);
  }, []);

  useEffect(() => {
    if (!user) {
      setActorState({
        actorId: '',
        name: '',
        type: '',
      });

      return;
    }

    const savedActorId = localStorage.getItem('actorId');

    if (savedActorId === user.actorId) {
      setActorState({
        actorId: user.actorId,
        name: user.name || 'Owner',
        type: 'owner',
      });

      return;
    }

    const assistant = assistants.find(
      (item) => item.assistantId === savedActorId
    );

    if (assistant) {
      setActorState({
        actorId: assistant.assistantId,
        name: assistant.name,
        type: 'assistant',
      });

      return;
    }

    setActorState({
      actorId: '',
      name: '',
      type: '',
    });
  }, [user, assistants]);

  const value = useMemo(
    () => ({
      actor,
      setActor,
      assistants,
      isActorSelected: Boolean(actor.actorId),
    }),
    [actor, setActor, assistants]
  );

  return (
    <ActorContext.Provider value={value}>
      {children}
    </ActorContext.Provider>
  );
}

export function useActor() {
  const context = useContext(ActorContext);

  if (!context) {
    throw new Error('useActor must be used inside ActorProvider.');
  }

  return context;
}

// ---------- Active Account Context ----------

const ActiveAccountContext = createContext(null);

export function ActiveAccountProvider({ children }) {
  const [activeAccount, setActiveAccount] = useState(() => {
    const saved = localStorage.getItem('activeAccount');

    return saved ? JSON.parse(saved) : null;
  });

  const selectAccount = useCallback((account) => {
    setActiveAccount(account);

    if (account) {
      localStorage.setItem('activeAccount', JSON.stringify(account));
    } else {
      localStorage.removeItem('activeAccount');
    }
  }, []);

  const value = useMemo(
    () => ({
      activeAccount,
      activeAccountId: activeAccount?._id || 'all',
      setActiveAccount: selectAccount,
    }),
    [activeAccount, selectAccount]
  );

  return (
    <ActiveAccountContext.Provider value={value}>
      {children}
    </ActiveAccountContext.Provider>
  );
}

export function useActiveAccount() {
  const context = useContext(ActiveAccountContext);

  if (!context) {
    throw new Error(
      'useActiveAccount must be used inside ActiveAccountProvider.'
    );
  }

  return context;
}

// ---------- Toast Context ----------

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) =>
      current.filter((toast) => toast.id !== id)
    );
  }, []);

  const showToast = useCallback(
    (message, type = 'success') => {
      const id = `${Date.now()}-${Math.random()}`;

      setToasts((current) => [
        ...current,
        { id, message, type },
      ]);

      window.setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      removeToast,
    }),
    [toasts, showToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider.');
  }

  return context;
}