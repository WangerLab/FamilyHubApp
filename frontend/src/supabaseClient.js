import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// --- "Stay logged in" preference ---
// Default = true (persistent across browser restarts). When false, session
// lives in sessionStorage only and is cleared when the tab/browser is closed.
const REMEMBER_KEY = 'wanger-family-hub-remember-me';

export const getRememberMe = () => {
  try {
    const v = localStorage.getItem(REMEMBER_KEY);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
};

export const setRememberMe = (remember) => {
  try {
    localStorage.setItem(REMEMBER_KEY, String(!!remember));
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
};

// Custom storage adapter: routes Supabase auth tokens to the storage the user picked.
const authStorage = {
  getItem: (key) => {
    try {
      if (getRememberMe()) return localStorage.getItem(key);
      return sessionStorage.getItem(key) ?? localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (getRememberMe()) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  },
  removeItem: (key) => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
  },
};

// Single module-level singleton — never recreated on re-renders
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'wanger-family-hub-auth',
    storage: authStorage,
  },
});
