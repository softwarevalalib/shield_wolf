import { z } from 'zod';
import { isSafeHttpUrl } from '../middleware/securityHeaders.js';

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((v) => (v === '' ? null : v));

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable()
  .or(z.literal(''))
  .transform((v) => (v === '' ? null : v));

export const adminSettingsGroupSchema = z.enum([
  'business',
  'store',
  'payments',
  'delivery',
  'tax',
  'email',
  'security',
  'integrations',
]);

export const adminContentPageSchema = z.enum([
  'homepage',
  'about',
  'faq',
  'contact',
  'delivery',
  'banners',
  'announcements',
]);

export const adminSettingsPatchSchema = z.object({
  group: adminSettingsGroupSchema,
  value: z.record(z.string(), z.any()),
});

export const adminContentPatchSchema = z.object({
  page: adminContentPageSchema,
  value: z.record(z.string(), z.any()),
});

export const adminTestimonialWriteSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const adminTestimonialListQuerySchema = z.object({
  q: z.string().trim().max(120).optional().or(z.literal('')),
  active: z.enum(['true', 'false', 'all']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const adminMediaRegisterSchema = z
  .object({
    url: z.string().trim().url().max(500),
    altText: optionalText,
    publicId: optionalText,
    mimeType: z.string().trim().max(120).optional().nullable().or(z.literal('')),
    provider: z.string().trim().max(40).optional().nullable().or(z.literal('')),
    sizeBytes: z.coerce.number().int().min(0).optional().nullable(),
    width: z.coerce.number().int().min(0).optional().nullable(),
    height: z.coerce.number().int().min(0).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!isSafeHttpUrl(value.url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'URL must use http or https',
        path: ['url'],
      });
    }
  });

export const adminMediaListQuerySchema = z.object({
  q: z.string().trim().max(120).optional().or(z.literal('')),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export { optionalUrl };
