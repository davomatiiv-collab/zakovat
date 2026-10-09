import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  register: (data: { username: string; name: string; schoolOrOrg?: string; role?: 'teacher' | 'admin' }) => Promise<void>;
  logout: () => void;
  quickSwitchDemoUser: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore session or auto-login default teacher for smooth trial
    const savedUser = localStorage.getItem('zakovat_user');
    const savedToken = localStorage.getItem('zakovat_token');

    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
        setIsLoading(false);
        return;
      } catch {}
    }

    // Default demo login as teacher for easy instant exploration
    api.login('muallim', 'muallim123')
      .then((res) => {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('zakovat_user', JSON.stringify(res.user));
        localStorage.setItem('zakovat_token', res.token);
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (username: string, pass: string) => {
    const res = await api.login(username, pass);
    setUser(res.user);
    setToken(res.token);
    localStorage.setItem('zakovat_user', JSON.stringify(res.user));
    localStorage.setItem('zakovat_token', res.token);
  };

  const register = async (data: { username: string; name: string; schoolOrOrg?: string; role?: 'teacher' | 'admin' }) => {
    const res = await api.register(data);
    setUser(res.user);
    setToken(res.token);
    localStorage.setItem('zakovat_user', JSON.stringify(res.user));
    localStorage.setItem('zakovat_token', res.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('zakovat_user');
    localStorage.removeItem('zakovat_token');
  };

  const quickSwitchDemoUser = async (username: string) => {
    let pass = 'zakovat123';
    if (username === 'admin') pass = 'admin123';
    if (username === 'muallim') pass = 'muallim123';
    if (username === 'tarixchi') pass = 'tarix123';
    await login(username, pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        quickSwitchDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
