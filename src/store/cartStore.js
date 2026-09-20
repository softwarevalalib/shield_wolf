import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Persistent cart client state.
 * Guest and signed-in users share this local cart until checkout sync (later phases).
 * Display snapshots only — server quote recalculates prices.
 */
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const items = [...get().items];
        const index = items.findIndex(
          (existing) =>
            existing.productId === item.productId && existing.variantId === (item.variantId ?? null)
        );

        if (index >= 0) {
          items[index] = {
            ...items[index],
            quantity: items[index].quantity + (item.quantity || 1),
            name: item.name || items[index].name,
            imageUrl: item.imageUrl || items[index].imageUrl,
            size: item.size ?? items[index].size,
            slug: item.slug || items[index].slug,
          };
        } else {
          items.push({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity || 1,
            // Snapshot display fields only — never trusted for pricing.
            name: item.name,
            imageUrl: item.imageUrl,
            size: item.size || null,
            slug: item.slug || null,
          });
        }

        set({ items });
      },
      updateQuantity: (productId, variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.productId === productId && item.variantId === (variantId ?? null)
              ? { ...item, quantity }
              : item
          ),
        });
      },
      removeItem: (productId, variantId = null) => {
        set({
          items: get().items.filter(
            (item) => !(item.productId === productId && item.variantId === variantId)
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: 'sw-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
