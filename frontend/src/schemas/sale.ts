import { z } from 'zod';
export const checkoutSchema = z.object({
  paymentMethod: z.enum(['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER']),
});
export type CheckoutValues = z.infer<typeof checkoutSchema>;
