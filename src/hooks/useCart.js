import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useCartStore } from '@/store/cartStore';

/**
 * Local cart actions + server-priced quote.
 */
export function useCart() {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const payload = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    [items]
  );

  const quoteQuery = useQuery({
    queryKey: ['cart', 'quote', payload],
    enabled: items.length > 0,
    queryFn: async () => {
      const result = await apiClient.post('/cart/quote', { items: payload });
      return result.data;
    },
    staleTime: 15_000,
  });

  return {
    items,
    itemCount,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    quote: quoteQuery.data || null,
    quoteLoading: quoteQuery.isLoading || quoteQuery.isFetching,
    quoteError: quoteQuery.isError,
    refetchQuote: quoteQuery.refetch,
  };
}
