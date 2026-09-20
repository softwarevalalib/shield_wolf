import { z } from 'zod';
import { HttpError } from '../utils/errors.js';

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: z
    .string()
    .trim()
    .email('Valid email is required')
    .transform((v) => v.toLowerCase()),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  whatsapp: z.string().trim().max(30).optional().or(z.literal('')),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Valid email is required')
    .transform((v) => v.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export function parseOrThrow(schema, data) {
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
