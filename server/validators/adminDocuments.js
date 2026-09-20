import { z } from 'zod';

export const adminDocumentListQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['all', 'draft', 'issued', 'void']).optional().default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
