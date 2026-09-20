import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';

export function useProduct(slug) {
  return useQuery({
    queryKey: ['products', 'detail', slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const payload = await apiClient.get(`/products/${encodeURIComponent(slug)}`);
      return payload.data;
    },
  });
}
