/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { demoUsers } from '../data/mockData';
import { SESSION_IDLE_LIMIT_MS } from '../lib/constants';
import { isValidJsid, jsidToAuthEmail, normalizeJsid } from '../lib/jsid';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AppUser } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  isDemoMode: boolean;
  login: (jsid: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setNewPassword: (password: string) => Promise<void>;
  requestPasswordReset: (jsid: string) => Promise<void>;
  submitRegistration: (payload: { name: string; department: string; requestedRole?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_USER_KEY = 'worktrack.demoUser';
const LAST_ACTIVITY_KEY = 'worktrack.lastActivity';

async function fetchProfile(userId: string): Promise<AppUser | null> {
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) {
    throw error;
  }
  return data as AppUser | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    localStorage.removeItem(DEMO_USER_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    sessionStorage.removeItem(DEMO_USER_KEY);
    setUser(null);
    if (supabase) {
      await supabase.auth.signOut({ scope: 'local' });
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user && active) {
            const profile = await fetchProfile(data.session.user.id);
            setUser(profile);
          }
        } else {
          const stored = localStorage.getItem(DEMO_USER_KEY) ?? sessionStorage.getItem(DEMO_USER_KEY);
          if (stored && active) {
            setUser(JSON.parse(stored) as AppUser);
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void boot();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    };
    const checkIdle = () => {
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? Date.now());
      if (Date.now() - last > SESSION_IDLE_LIMIT_MS) {
        void logout();
      }
    };

    updateActivity();
    const events = ['click', 'keydown', 'mousemove', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, updateActivity, { passive: true }));
    const interval = window.setInterval(checkIdle, 60_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, updateActivity));
      window.clearInterval(interval);
    };
  }, [logout, user]);

  useEffect(() => {
    if (!supabase || !user) {
      return undefined;
    }
    const client = supabase;
    const channel = client
      .channel(`worktrack-user-status-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as AppUser;
          if (next.status !== 'active') {
            void logout();
          } else {
            setUser(next);
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [logout, user]);

  const login = useCallback(async (jsidInput: string, password: string, remember: boolean) => {
    const jsid = normalizeJsid(jsidInput);
    if (!isValidJsid(jsid)) {
      throw new Error('Enter a valid JSID (e.g., JS0001 or JS21587).');
    }

    if (!isSupabaseConfigured || !supabase) {
      const demo = demoUsers.find((candidate) => candidate.jsid === jsid);
      if (!demo || !['password', 'demo', 'worktrack'].includes(password)) {
        throw new Error('Use a demo JSID and password "password" when Supabase is not configured.');
      }
      if (demo.status !== 'active') {
        throw new Error('This account is not active.');
      }
      setUser(demo);
      if (remember) {
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
      } else {
        sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
      }
      return;
    }

    const { data: resolved, error: resolveError } = await supabase.rpc('resolve_jsid_login', {
      input_jsid: jsid,
    });
    if (resolveError) {
      throw resolveError;
    }
    const authEmail = (resolved as { auth_email?: string } | null)?.auth_email ?? jsidToAuthEmail(jsid);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });
    if (error) {
      throw error;
    }
    if (!data.user) {
      throw new Error('Login failed.');
    }
    const profile = await fetchProfile(data.user.id);
    if (!profile || profile.status !== 'active') {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('This account is not active.');
    }
    setUser(profile);
  }, []);

  const setNewPassword = useCallback(
    async (password: string) => {
      if (!user) {
        return;
      }
      if (!supabase) {
        const next = { ...user, first_login_done: true };
        setUser(next);
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(next));
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }
      const { error: rpcError } = await supabase.rpc('mark_first_login_done');
      if (rpcError) {
        throw rpcError;
      }
      setUser({ ...user, first_login_done: true });
    },
    [user],
  );

  const requestPasswordReset = useCallback(async (jsidInput: string) => {
    const jsid = normalizeJsid(jsidInput);
    if (!isValidJsid(jsid)) {
      throw new Error('Enter a valid JSID (e.g., JS0001 or JS21587).');
    }
    if (!supabase) {
      return;
    }
    const { error } = await supabase.rpc('request_password_reset_by_jsid', { input_jsid: jsid });
    if (error) {
      throw error;
    }
  }, []);

  const submitRegistration = useCallback(
    async (payload: { name: string; department: string; requestedRole?: string }) => {
      if (!supabase) {
        return;
      }
      const { error } = await supabase.rpc('submit_self_registration', {
        input_name: payload.name,
        input_department: payload.department,
        input_requested_role: payload.requestedRole ?? 'employee',
      });
      if (error) {
        throw error;
      }
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isDemoMode: !isSupabaseConfigured,
      login,
      logout,
      setNewPassword,
      requestPasswordReset,
      submitRegistration,
    }),
    [loading, login, logout, requestPasswordReset, setNewPassword, submitRegistration, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
