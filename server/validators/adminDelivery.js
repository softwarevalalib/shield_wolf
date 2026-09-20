import { z } from 'zod';

export const DELIVERY_STATUSES = [
  'pending',
  'scheduled',
  'assigned',
  'picked_up',
  'out_for_delivery',
  'attempted',
  'delivered',
  'failed',
  'returned',
  'cancelled',
];

export const adminDeliveryListQuerySchema = z.object({
  q: z.string().optional(),
  status: z
    .enum([...DELIVERY_STATUSES, 'all'])
    .optional()
    .default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminDeliveryCreateSchema = z.object({
  orderId: z.string().min(1),
  driverId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  deliveryZoneId: z.string().optional().nullable(),
  expectedAt: z.string().optional().nullable(),
  adminNotes: z.string().max(2000).optional().nullable(),
});

export const adminDeliveryUpdateSchema = z.object({
  status: z.enum(DELIVERY_STATUSES).optional(),
  driverId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  deliveryZoneId: z.string().optional().nullable(),
  expectedAt: z.string().optional().nullable(),
  dispatchAt: z.string().optional().nullable(),
  adminNotes: z.string().max(2000).optional().nullable(),
  driverNotes: z.string().max(2000).optional().nullable(),
  failureReason: z.string().max(1000).optional().nullable(),
  proofOfDeliveryUrl: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .refine((v) => !v || v.startsWith('/') || /^https?:\/\//i.test(v), 'Invalid URL'),
  note: z.string().max(1000).optional().nullable(),
});

export const adminDriverWriteSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().min(7).max(30),
  status: z.enum(['active', 'inactive', 'on_delivery']).optional().default('active'),
});

export const adminVehicleWriteSchema = z.object({
  label: z.string().min(1).max(120),
  plateNumber: z.string().max(40).optional().nullable(),
  vehicleType: z.string().max(60).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const adminZoneWriteSchema = z.object({
  name: z.string().min(1).max(120),
  county: z.string().max(120).optional().nullable(),
  communities: z.array(z.string()).optional().default([]),
  deliveryFee: z.coerce.number().min(0),
  minimumFreeDeliveryAmount: z.coerce.number().min(0).optional().nullable(),
  estimatedTime: z.string().max(120).optional().nullable(),
  active: z.boolean().optional().default(true),
});
