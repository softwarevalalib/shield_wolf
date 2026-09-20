import { z } from 'zod';

export const MOVEMENT_TYPES = [
  'addition',
  'deduction',
  'adjustment',
  'sale',
  'return',
  'damaged',
  'restock',
];

export const inventoryListQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['all', 'in_stock', 'low', 'out']).optional().default('all'),
  categoryId: z.string().optional().nullable(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const inventoryMovementsQuerySchema = z.object({
  productId: z.string().optional().nullable(),
  movementType: z
    .enum([...MOVEMENT_TYPES, 'all'])
    .optional()
    .default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const inventoryMovementWriteSchema = z
  .object({
    productId: z.string().min(1),
    variantId: z.string().optional().nullable(),
    movementType: z.enum(MOVEMENT_TYPES),
    /** Absolute units to add/remove (always positive). For adjustment, target absolute stock. */
    quantity: z.coerce.number().int().min(0),
    reason: z.string().max(500).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    referenceType: z.string().max(80).optional().nullable(),
    referenceId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.movementType === 'adjustment') {
      // quantity = new absolute stock level
      return;
    }
    if (data.quantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Quantity must be greater than zero',
        path: ['quantity'],
      });
    }
  });
