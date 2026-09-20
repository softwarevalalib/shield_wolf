import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const LoadingContext = createContext(null);

/**
 * Global and keyed loading-state foundation.
 */
export function LoadingProvider({ children }) {
  const [keys, setKeys] = useState(() => new Set());

  const startLoading = useCallback((key = 'global') => {
    setKeys((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });
  }, []);

  const stopLoading = useCallback((key = 'global') => {
    setKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isGlobalLoading: keys.has('global') || keys.size > 0,
      isLoading: (key = 'global') => keys.has(key),
      startLoading,
      stopLoading,
      withLoading: async (fn, key = 'global') => {
        startLoading(key);
        try {
          return await fn();
        } finally {
          stopLoading(key);
        }
      },
    }),
    [keys, startLoading, stopLoading]
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
}
