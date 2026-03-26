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
    // With Zustand persist, we don't need to manually read localStorage.
    // We just wait for the component to mount (re-hydration happens automatically).
    setInitialized(true);
  }, []);

  return (
    <AuthContext.Provider value={{ initialized }}>
      {children}
    </AuthContext.Provider>
  );
};
