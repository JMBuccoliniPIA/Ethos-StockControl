import { z } from 'zod';
import { ProductStatus } from '@ethos/shared';

export const createProductSchema = z.object({
  sku: z.string().min(1, 'El SKU es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  familyId: z.string().min(1, 'La familia es requerida'),
  subfamilyId: z.string().optional(),
  stock: z.coerce.number().min(0).default(0),
  stockMin: z.coerce.number().min(0).default(0),
  basePrice: z.coerce.number().min(0, 'El precio es requerido'),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
});

export type CreateProductFormData = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  description: z.string().optional(),
  familyId: z.string().optional(),
  subfamilyId: z.string().optional(),
  stockMin: z.coerce.number().min(0).optional(),
  basePrice: z.coerce.number().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
});

export type UpdateProductFormData = z.infer<typeof updateProductSchema>;
