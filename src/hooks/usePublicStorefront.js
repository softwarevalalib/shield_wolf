import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';

export function usePublicStorefront() {
  return useQuery({
    queryKey: ['storefront', 'public'],
    queryFn: async () => {
      const payload = await apiClient.get('/settings/public');
      return payload.data;
    },
    staleTime: 60_000,
  });
}
