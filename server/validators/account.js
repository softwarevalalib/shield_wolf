import { z } from 'zod';
import { HttpError } from '../utils/errors.js';

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

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  whatsapp: z.string().trim().max(30).optional().or(z.literal('')),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});

export const addressSchema = z.object({
  label: z.string().trim().max(80).optional().or(z.literal('')),
  firstName: z.string().trim().max(80).optional().or(z.literal('')),
  lastName: z.string().trim().max(80).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  county: z.string().trim().min(1, 'County is required').max(80),
  city: z.string().trim().min(1, 'City is required').max(80),
  community: z.string().trim().min(1, 'Community is required').max(120),
  streetLandmark: z.string().trim().min(1, 'Street or landmark is required').max(200),
  deliveryInstructions: z.string().trim().max(500).optional().or(z.literal('')),
  isDefault: z.boolean().optional(),
});

export function parseProfileUpdate(data) {
  return parseOrThrow(profileUpdateSchema, data);
}

export function parsePasswordChange(data) {
  return parseOrThrow(passwordChangeSchema, data);
}

export function parseAddress(data) {
  return parseOrThrow(addressSchema, data);
}
