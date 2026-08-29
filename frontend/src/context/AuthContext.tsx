import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api, setTokens, clearTokens, getRefreshToken } from '../api/client';
import type { User } from '../api/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: Record<string, string>) => Promise<void>;
  register: (payload: Record<string, string>) => Promise<void>;
  loginWithTokens: (access: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (err) {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleLogoutEvent = () => {
      setUser(null);
    };
    window.addEventListener('arceus:logout', handleLogoutEvent);

    fetchUser();

    return () => {
      window.removeEventListener('arceus:logout', handleLogoutEvent);
    };
  }, []);

  const login = async (payload: Record<string, string>) => {
    const res = await api.login(payload);
    setTokens(res.access_token, res.refresh_token);
    await fetchUser();
  };

  const register = async (payload: Record<string, string>) => {
    const res = await api.register(payload);
    setTokens(res.access_token, res.refresh_token);
    await fetchUser();
  };

  const loginWithTokens = async (access: string, refresh: string) => {
    setTokens(access, refresh);
    await fetchUser();
  };

  const logout = async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await api.logout(refresh);
      } catch (err) {
        // ignore logout failure
      }
    }
    clearTokens();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    loginWithTokens,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
