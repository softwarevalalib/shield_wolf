import { z } from 'zod';

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'awaiting_payment',
  'paid',
  'processing',
  'packed',
  'ready_for_dispatch',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
];

export const adminOrderListQuerySchema = z.object({
  q: z.string().optional(),
  status: z
    .enum([...ORDER_STATUSES, 'all'])
    .optional()
    .default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().max(1000).optional().nullable(),
});

export const adminOrderNotesSchema = z.object({
  adminNotes: z.string().max(5000).optional().nullable(),
});
