import { z } from 'zod';

export const adminExpenseWriteSchema = z.object({
  categoryId: z.string().min(1),
  description: z.string().min(1).max(500),
  amount: z.coerce.number().positive(),
  currency: z.string().max(8).optional().default('LRD'),
  expenseDate: z.string().optional().nullable(),
  paymentMethod: z.string().max(60).optional().nullable(),
  reference: z.string().max(120).optional().nullable(),
  receiptUrl: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .refine((v) => !v || v.startsWith('/') || /^https?:\/\//i.test(v), 'Invalid URL'),
});

export const adminExpenseListQuerySchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional().default('all'),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminTransactionListQuerySchema = z.object({
  q: z.string().optional(),
  type: z
    .enum(['all', 'sale', 'payment', 'refund', 'expense', 'delivery_income', 'adjustment'])
    .optional()
    .default('all'),
  status: z.enum(['all', 'pending', 'posted', 'void']).optional().default('all'),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
