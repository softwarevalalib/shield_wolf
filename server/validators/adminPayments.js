import { z } from 'zod';

export const PAYMENT_STATUSES = [
  'pending',
  'pending_verification',
  'paid',
  'failed',
  'rejected',
  'refunded',
  'cancelled',
];

export const adminPaymentListQuerySchema = z.object({
  q: z.string().optional(),
  status: z
    .enum([...PAYMENT_STATUSES, 'all'])
    .optional()
    .default('pending_verification'),
  method: z
    .enum(['all', 'mtn_momo', 'orange_money', 'cod', 'card', 'bank_transfer', 'other'])
    .optional()
    .default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminPaymentActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'clarify', 'refund']),
  adminNote: z.string().max(2000).optional().nullable(),
});
