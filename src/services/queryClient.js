import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client.
 * Invalidation / refetch patterns for live catalog & admin updates land with features.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
