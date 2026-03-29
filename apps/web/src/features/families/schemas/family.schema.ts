import { z } from 'zod';

export const familySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
});

export type FamilyFormData = z.infer<typeof familySchema>;

export const subfamilySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  familyId: z.string().min(1, 'La familia es requerida'),
  parentId: z.string().nullable().optional(),
  description: z.string().optional(),
});

export type SubfamilyFormData = z.infer<typeof subfamilySchema>;
