import { z } from 'zod';

const moneyField = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === null || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(n) || n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a non-negative number' });
      return z.NEVER;
    }
    return n;
  });

const intField = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === null || value === '') return 0;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(n) || n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a non-negative integer' });
      return z.NEVER;
    }
    return n;
  });

const mediaUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith('/') || /^https?:\/\//i.test(value),
    'Must be an http(s) URL or site path'
  );

const imageSchema = z.object({
  id: z.string().optional().nullable(),
  url: mediaUrlSchema,
  altText: z.string().max(200).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  isPrimary: z.boolean().optional().default(false),
});

const variantSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().min(1).max(120),
  sku: z.string().max(80).optional().nullable(),
  size: z.string().max(80).optional().nullable(),
  unit: z.string().max(40).optional().nullable(),
  price: moneyField,
  compareAtPrice: moneyField,
  costPrice: moneyField,
  stockQuantity: intField,
  weight: moneyField,
  weightUnit: z.string().max(20).optional().nullable(),
  active: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
});

export const productStatusSchema = z.enum(['draft', 'published', 'archived']);

export const adminProductListQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived', 'all']).optional().default('all'),
  categoryId: z.string().optional().nullable(),
  sort: z
    .enum(['updated_desc', 'name_asc', 'price_asc', 'price_desc', 'stock_asc', 'stock_desc'])
    .optional()
    .default('updated_desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminProductWriteSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200),
    slug: z
      .string()
      .max(220)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case')
      .optional()
      .nullable(),
    sku: z.string().max(80).optional().nullable(),
    barcode: z.string().max(80).optional().nullable(),
    shortDescription: z.string().max(500).optional().nullable(),
    description: z.string().max(20000).optional().nullable(),
    categoryId: z.string().optional().nullable(),
    subcategory: z.string().max(120).optional().nullable(),
    brand: z.string().max(120).optional().nullable(),
    price: moneyField,
    compareAtPrice: moneyField,
    costPrice: moneyField,
    currency: z.string().min(3).max(3).optional().default('LRD'),
    tax: moneyField,
    stockQuantity: intField,
    lowStockThreshold: z.coerce.number().int().min(0).optional().default(5),
    weight: moneyField,
    weightUnit: z.string().max(20).optional().nullable(),
    size: z.string().max(80).optional().nullable(),
    unit: z.string().max(40).optional().nullable(),
    featured: z.boolean().optional().default(false),
    active: z.boolean().optional().default(true),
    status: productStatusSchema.optional().default('draft'),
    thumbnailUrl: z.union([mediaUrlSchema, z.literal(''), z.null()]).optional(),
    seoTitle: z.string().max(200).optional().nullable(),
    seoDescription: z.string().max(500).optional().nullable(),
    images: z.array(imageSchema).optional().default([]),
    variants: z.array(variantSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'published') {
      if (data.price == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Published products require a price',
          path: ['price'],
        });
      }
      if (!data.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Published products require a category',
          path: ['categoryId'],
        });
      }
    }
  });

export const adminProductBulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(['publish', 'draft', 'archive', 'delete']),
});

export const adminCategoryWriteSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case')
    .optional()
    .nullable(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.union([mediaUrlSchema, z.literal(''), z.null()]).optional(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  active: z.boolean().optional().default(true),
});
