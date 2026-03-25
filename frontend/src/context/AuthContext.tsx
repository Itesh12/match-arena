'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import '@/i18n';

const AuthContext = createContext<{ initialized: boolean }>({ initialized: false });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setUser, setToken } = useGameStore();
  const [initialized, setInitialized] = React.useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      setToken(token);
      setUser(JSON.parse(user));
    }
    setInitialized(true);
  }, [setUser, setToken]);

  return (
    <AuthContext.Provider value={{ initialized }}>
      {children}
    </AuthContext.Provider>
  );
};
