import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Environment } from '@/types';

interface EnvironmentContextType {
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  toggleEnvironment: () => void;
  isTransitioning: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType | null>(null);

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironment] = useState<Environment>(() => {
    return (localStorage.getItem('secondbrain:environment') as Environment) || 'personal';
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSetEnvironment = useCallback((env: Environment) => {
    if (env === environment) return;
    setIsTransitioning(true);
    // Brief fade-out, then switch, then fade-in
    setTimeout(() => {
      setEnvironment(env);
      localStorage.setItem('secondbrain:environment', env);
      setTimeout(() => setIsTransitioning(false), 30);
    }, 150);
  }, [environment]);

  const toggleEnvironment = useCallback(() => {
    handleSetEnvironment(environment === 'personal' ? 'work' : 'personal');
  }, [environment, handleSetEnvironment]);

  return (
    <EnvironmentContext.Provider value={{ environment, setEnvironment: handleSetEnvironment, toggleEnvironment, isTransitioning }}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error('useEnvironment must be used within EnvironmentProvider');
  return ctx;
}
