import { z } from 'zod';

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  unread: z.enum(['true', 'false', '1', '0']).optional(),
});

export const adminNotificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  channel: z.enum(['all', 'in_app', 'email', 'sms', 'whatsapp']).optional(),
  eventType: z.string().trim().max(80).optional(),
  q: z.string().trim().max(120).optional().or(z.literal('')),
});

export const notificationMarkSchema = z.object({
  action: z.enum(['read', 'read_all']),
  id: z.string().uuid().optional(),
});
