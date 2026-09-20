import { z } from 'zod';
import { HttpError } from '../utils/errors.js';

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(3, 'Order number is required').max(40),
  phone: z.string().trim().min(7, 'Phone number is required').max(30),
});

export function parseTrackOrder(data) {
  const parsed = trackOrderSchema.safeParse(data);
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
