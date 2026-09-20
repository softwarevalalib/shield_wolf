import { z } from 'zod';
import { HttpError } from '../utils/errors.js';

export const paymentSubmitSchema = z.object({
  orderNumber: z.string().trim().min(3, 'Order number is required').max(40),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  method: z.enum(['mtn_momo', 'orange_money']).optional(),
  reference: z.string().trim().min(3, 'Payment reference is required').max(120),
  customerNote: z.string().trim().max(500).optional().or(z.literal('')),
  evidenceUrl: z.string().trim().max(500).optional().or(z.literal('')),
});

export const paymentLookupSchema = z.object({
  orderNumber: z.string().trim().min(3, 'Order number is required').max(40),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
});

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
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

export function parsePaymentSubmit(data) {
  return parseOrThrow(paymentSubmitSchema, data);
}

export function parsePaymentLookup(data) {
  return parseOrThrow(paymentLookupSchema, data);
}
