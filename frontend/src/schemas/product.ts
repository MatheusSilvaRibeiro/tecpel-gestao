import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.'),
  brand: z.string(),
  description: z.string(),
  type: z.enum(['PERFUME', 'CREAM']),
  salePrice: z
    .string()
    .regex(/^\d{1,8}(\.\d{1,2})?$/, 'Informe um preço válido.')
    .refine((value) => Number(value) > 0, 'O preço deve ser maior que zero.'),
  image: z.instanceof(FileList).optional(),
});
export type ProductFormValues = z.infer<typeof productSchema>;
