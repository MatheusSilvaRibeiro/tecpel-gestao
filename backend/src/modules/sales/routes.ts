import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../errors/app-error.js';
import { authorize } from '../auth/authorize.js';
import type { SaleStore } from './sale-store.js';
import { CreateSale, GetSale, ListSales } from './use-cases.js';

const paymentMethod = z.enum([
  'CASH',
  'PIX',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'OTHER',
]);
const decimal = z
  .string()
  .regex(/^\d{1,8}(\.\d{1,2})?$/)
  .refine((value) => Number(value) > 0);
const createSchema = z
  .object({
    paymentMethod,
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive(),
          unitPrice: decimal.optional(),
        }),
      )
      .min(1),
  })
  .superRefine((value, context) => {
    const ids = value.items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: 'custom',
        message: 'Produto duplicado na venda.',
        path: ['items'],
      });
  });
const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  soldById: z.string().uuid().optional(),
  paymentMethod: paymentMethod.optional(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new AppError(400, 'VALIDATION_ERROR', 'Dados da venda inválidos.');
  return result.data;
}
function saleId(request: { params: Record<string, string | string[]> }) {
  const id = request.params.id;
  if (typeof id !== 'string')
    throw new AppError(400, 'VALIDATION_ERROR', 'Identificador inválido.');
  return id;
}

export function createSalesRouter(
  store: SaleStore,
  authenticate: RequestHandler,
) {
  const router = Router();
  const createSale = new CreateSale(store);
  const listSales = new ListSales(store);
  const getSale = new GetSale(store);
  router.use(authenticate, authorize('ADMIN', 'VENDEDOR'));
  router.post('/', async (request, response, next) => {
    try {
      const body = parse(createSchema, request.body);
      const sale = await createSale.execute({
        ...body,
        soldById: request.authUser.id,
        role: request.authUser.role,
      });
      response.status(201).json({
        data: { sale },
        message: 'Venda registrada com sucesso.',
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/', async (request, response, next) => {
    try {
      const sales = await listSales.execute(parse(querySchema, request.query));
      response.json({ data: { sales }, message: null, meta: null });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:id', async (request, response, next) => {
    try {
      const sale = await getSale.execute(saleId(request));
      response.json({ data: { sale }, message: null, meta: null });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
