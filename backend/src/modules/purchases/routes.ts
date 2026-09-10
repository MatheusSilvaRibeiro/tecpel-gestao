import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../../errors/app-error.js';
import { authorize } from '../auth/authorize.js';
import type { PurchaseStore } from './purchase-store.js';
import { CreatePurchase, GetPurchase, ListPurchases } from './use-cases.js';

const decimal = z
  .string()
  .regex(/^\d{1,8}(\.\d{1,2})?$/)
  .refine((value) => Number(value) > 0);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((value, context) => {
    const parsed = new Date(`${value}T12:00:00.000Z`);
    if (
      Number.isNaN(parsed.valueOf()) ||
      parsed.toISOString().slice(0, 10) !== value
    ) {
      context.addIssue({ code: 'custom', message: 'Data inválida.' });
      return z.NEVER;
    }
    return parsed;
  });
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .optional();
const createSchema = z
  .object({
    supplierName: optionalText,
    invoiceNumber: optionalText,
    purchaseDate: date,
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive(),
          unitCost: decimal,
        }),
      )
      .min(1),
  })
  .superRefine((value, context) => {
    const ids = value.items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: 'custom',
        message: 'Produto duplicado.',
        path: ['items'],
      });
  });
const querySchema = z.object({
  startDate: date.optional(),
  endDate: date.optional(),
  supplier: z.string().trim().min(1).optional(),
});
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const duplicate = result.error.issues.some(
      (issue) => issue.message === 'Produto duplicado.',
    );
    throw new AppError(
      400,
      duplicate ? 'DUPLICATE_PRODUCT' : 'INVALID_PURCHASE',
      duplicate
        ? 'O mesmo produto não pode ser adicionado duas vezes.'
        : 'Dados da compra inválidos.',
    );
  }
  return result.data;
}

export function createPurchasesRouter(
  store: PurchaseStore,
  authenticate: RequestHandler,
) {
  const router = Router();
  const create = new CreatePurchase(store);
  const list = new ListPurchases(store);
  const get = new GetPurchase(store);
  router.use(authenticate, authorize('ADMIN'));
  router.post('/', async (request, response, next) => {
    try {
      const body = parse(createSchema, request.body);
      const purchase = await create.execute({
        ...body,
        createdById: request.authUser.id,
      });
      response
        .status(201)
        .json({
          data: { purchase },
          message: 'Compra registrada com sucesso.',
          meta: null,
        });
    } catch (error) {
      next(error);
    }
  });
  router.get('/', async (request, response, next) => {
    try {
      const purchases = await list.execute(parse(querySchema, request.query));
      response.json({ data: { purchases }, message: null, meta: null });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:id', async (request, response, next) => {
    try {
      const id = request.params.id;
      if (typeof id !== 'string')
        throw new AppError(400, 'INVALID_PURCHASE', 'Identificador inválido.');
      response.json({
        data: { purchase: await get.execute(id) },
        message: null,
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
