import { z } from 'zod';
import { HttpError } from '../utils/errors.js';

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().nullable().optional(),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1, 'Cart is empty'),
  customer: z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(80),
    lastName: z.string().trim().min(1, 'Last name is required').max(80),
    phone: z.string().trim().min(7, 'Phone is required').max(30),
    whatsapp: z.string().trim().max(30).optional().or(z.literal('')),
    email: z.string().trim().email('Valid email is required'),
    paymentReference: z.string().trim().max(120).optional().or(z.literal('')),
    paymentNote: z.string().trim().max(500).optional().or(z.literal('')),
  }),
  delivery: z.object({
    zoneId: z.string().min(1, 'Delivery zone is required'),
    county: z.string().trim().min(1, 'County is required').max(80),
    city: z.string().trim().min(1, 'City is required').max(80),
    community: z.string().trim().min(1, 'Community is required').max(120),
    streetLandmark: z.string().trim().min(1, 'Street or landmark is required').max(200),
    deliveryInstructions: z.string().trim().max(500).optional().or(z.literal('')),
  }),
  paymentMethod: z.enum(['cod', 'mtn_momo', 'orange_money'], {
    errorMap: () => ({ message: 'Select a valid payment method' }),
  }),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

export function parseCheckout(data) {
  const parsed = checkoutSchema.safeParse(data);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new HttpError(400, details[0]?.message || 'Validation failed', {
      code: 'VALIDATION_ERROR',
      details,
    });
  }
  return parsed.data;
}
