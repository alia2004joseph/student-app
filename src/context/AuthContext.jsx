import React, { createContext, useContext, useState, useCallback } from 'react';
import { API_BASE } from '../config';

const STORAGE_KEY = 'school_auth';

const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth); // { token, username } | null

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API_BASE}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      throw new Error('Invalid username or password.');
    }
    const data = await res.json();
    const nextAuth = { token: data.token, username: data.username, userId: data.user_id };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
    setAuth(nextAuth);
    return nextAuth;
  }, []);

  const logout = useCallback(async () => {
    if (auth?.token) {
      try {
        await fetch(`${API_BASE}/logout/`, {
          method: 'POST',
          headers: { Authorization: `Token ${auth.token}` },
        });
      } catch {
        // Ignore network errors on logout — clear local state regardless.
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }, [auth]);

  const value = {
    token: auth?.token || null,
    username: auth?.username || null,
    userId: auth?.userId || null,
    isAuthenticated: Boolean(auth?.token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>');
  return ctx;
}

/**
 * Helper for API calls elsewhere in the app (e.g. Students.jsx) — attaches
 * the Authorization header automatically. Reads directly from localStorage
 * since this runs outside React components/hooks.
 */
export function authHeaders() {
  const stored = readStoredAuth();
  return stored?.token ? { Authorization: `Token ${stored.token}` } : {};
}

/** Raw token string, for building WebSocket URLs (ws://.../?token=...). */
export function getToken() {
  return readStoredAuth()?.token || null;
}