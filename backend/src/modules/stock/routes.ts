import { Router } from 'express';
import { z } from 'zod';

import { AppError } from '../../errors/app-error.js';
import { authorize } from '../auth/authorize.js';
import type { ProductStore } from '../products/product-store.js';
import {
  GetProductStock,
  RegisterStockAdjustment,
  RegisterStockEntry,
} from './use-cases.js';

const decimal = z
  .string()
  .regex(/^\d{1,8}(\.\d{1,2})?$/)
  .refine((value) => Number(value) > 0);
const entrySchema = z.object({
  quantity: z.number().int().positive(),
  unitCost: decimal,
  note: z.string().trim().min(1).optional(),
});
const adjustmentSchema = z.object({
  quantity: z
    .number()
    .int()
    .refine((quantity) => quantity !== 0),
  note: z.string().trim().min(1),
});

function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new AppError(400, 'VALIDATION_ERROR', 'Payload inválido.');
  return parsed.data;
}

function productId(request: { params: Record<string, string | string[]> }) {
  const id = request.params.id;
  if (typeof id !== 'string')
    throw new AppError(400, 'VALIDATION_ERROR', 'Identificador inválido.');
  return id;
}

export function createStockRouter(store: ProductStore) {
  const router = Router({ mergeParams: true });
  const registerEntry = new RegisterStockEntry(store);
  const registerAdjustment = new RegisterStockAdjustment(store);
  const getStock = new GetProductStock(store);

  router.post(
    '/entries',
    authorize('ADMIN'),
    async (request, response, next) => {
      try {
        const body = validate(entrySchema, request.body);
        const result = await registerEntry.execute({
          productId: productId(request),
          quantity: body.quantity,
          unitCost: body.unitCost,
          note: body.note,
          createdBy: request.authUser.id,
        });
        response.status(201).json({ data: result, message: null, meta: null });
      } catch (error) {
        next(error);
      }
    },
  );
  router.post(
    '/adjustments',
    authorize('ADMIN'),
    async (request, response, next) => {
      try {
        const body = validate(adjustmentSchema, request.body);
        const result = await registerAdjustment.execute({
          productId: productId(request),
          quantity: body.quantity,
          note: body.note,
          createdBy: request.authUser.id,
        });
        response.status(201).json({ data: result, message: null, meta: null });
      } catch (error) {
        next(error);
      }
    },
  );
  router.get(
    '/',
    authorize('ADMIN', 'VENDEDOR'),
    async (request, response, next) => {
      try {
        response.json({
          data: await getStock.execute(productId(request)),
          message: null,
          meta: null,
        });
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
