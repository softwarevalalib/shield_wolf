import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/services/apiClient';
import { clearAuthTokens, getAccessToken, setAccessToken } from '@/services/authTokenStorage';
import { isStaffUser as checkIsStaff } from '@/utils/permissions';

const AuthContext = createContext(null);

/**
 * Customer/staff authentication.
 * Admin UI access is staff-role gated; permissions enforced in Phase 13+.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateSession = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const result = await apiClient.get('/auth/me');
      setUser(result.data?.user ?? null);
    } catch {
      clearAuthTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const loginWithToken = useCallback((token, nextUser) => {
    setAccessToken(token);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async ({ identifier, password }) => {
      const result = await apiClient.post('/auth/login', { identifier, password });
      const token = result.data?.token;
      const nextUser = result.data?.user;
      if (!token || !nextUser) {
        throw new Error(result.message || 'Login failed');
      }
      loginWithToken(token, nextUser);
      return nextUser;
    },
    [loginWithToken]
  );

  const adminLogin = useCallback(
    async ({ identifier, password }) => {
      const result = await apiClient.post('/auth/admin/login', { identifier, password });
      const token = result.data?.token;
      const nextUser = result.data?.user;
      if (!token || !nextUser) {
        throw new Error(result.message || 'Admin login failed');
      }
      loginWithToken(token, nextUser);
      return nextUser;
    },
    [loginWithToken]
  );

  const register = useCallback(
    async (payload) => {
      const result = await apiClient.post('/auth/register', payload);
      const token = result.data?.token;
      const nextUser = result.data?.user;
      if (!token || !nextUser) {
        throw new Error(result.message || 'Registration failed');
      }
      loginWithToken(token, nextUser);
      return nextUser;
    },
    [loginWithToken]
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Client logout still clears local session if API is unavailable.
    } finally {
      clearAuthTokens();
      setUser(null);
    }
  }, []);

  const value = useMemo(() => {
    const roles = user?.roles ?? [];
    const isStaff = checkIsStaff(user);

    return {
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin: isStaff,
      isStaff,
      roles,
      permissions: user?.permissions ?? [],
      hasPermission: (permission) => {
        if (roles.includes('super_admin')) return true;
        return (user?.permissions ?? []).includes(permission);
      },
      hasAnyPermission: (list = []) => {
        if (roles.includes('super_admin')) return true;
        return list.some((permission) => (user?.permissions ?? []).includes(permission));
      },
      login,
      adminLogin,
      register,
      loginWithToken,
      logout,
      refreshSession: hydrateSession,
    };
  }, [user, isLoading, login, adminLogin, register, loginWithToken, logout, hydrateSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
