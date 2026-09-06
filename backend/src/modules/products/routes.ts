import { unlink } from 'node:fs/promises';

import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../../errors/app-error.js';
import { authorize } from '../auth/authorize.js';
import { createStockRouter } from '../stock/routes.js';
import type { ProductStore } from './product-store.js';
import {
  createProductUpload,
  productImageUrl,
  validateProductImage,
} from './upload.js';
import {
  CreateProduct,
  DeactivateProduct,
  GetProduct,
  ListProducts,
  UpdateProduct,
} from './use-cases.js';

const decimal = z
  .string()
  .regex(/^\d{1,8}(\.\d{1,2})?$/)
  .refine((value) => Number(value) > 0);
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .optional();
const productSchema = z.object({
  name: z.string().trim().min(1),
  brand: optionalText,
  description: optionalText,
  type: z.enum(['PERFUME', 'CREAM']),
  salePrice: decimal,
});
const updateSchema = productSchema.partial();
const querySchema = z.object({
  search: z.string().trim().min(1).optional(),
  type: z.enum(['PERFUME', 'CREAM']).optional(),
  active: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new AppError(400, 'VALIDATION_ERROR', 'Dados do produto inválidos.');
  return result.data;
}

function productId(request: { params: Record<string, string | string[]> }) {
  const id = request.params.id;
  if (typeof id !== 'string')
    throw new AppError(400, 'VALIDATION_ERROR', 'Identificador inválido.');
  return id;
}

export function createProductsRouter(
  store: ProductStore,
  authenticate: RequestHandler,
  uploadDirectory: string,
) {
  const router = Router();
  const upload = createProductUpload(uploadDirectory);
  const createProduct = new CreateProduct(store);
  const listProducts = new ListProducts(store);
  const getProduct = new GetProduct(store);
  const updateProduct = new UpdateProduct(store);
  const deactivateProduct = new DeactivateProduct(store);

  router.use(authenticate);
  router.get(
    '/',
    authorize('ADMIN', 'VENDEDOR'),
    async (request, response, next) => {
      try {
        const products = await listProducts.execute(
          parse(querySchema, request.query),
        );
        response.json({ data: { products }, message: null, meta: null });
      } catch (error) {
        next(error);
      }
    },
  );
  router.post(
    '/',
    authorize('ADMIN'),
    upload.single('image'),
    async (request, response, next) => {
      try {
        if (request.file)
          await validateProductImage(request.file.path, request.file.mimetype);
        const product = await createProduct.execute({
          ...parse(productSchema, request.body),
          imageUrl: request.file
            ? productImageUrl(request.file.filename)
            : null,
        });
        response
          .status(201)
          .json({ data: { product }, message: null, meta: null });
      } catch (error) {
        if (request.file)
          await unlink(request.file.path).catch(() => undefined);
        next(error);
      }
    },
  );
  router.get(
    '/:id',
    authorize('ADMIN', 'VENDEDOR'),
    async (request, response, next) => {
      try {
        response.json({
          data: { product: await getProduct.execute(productId(request)) },
          message: null,
          meta: null,
        });
      } catch (error) {
        next(error);
      }
    },
  );
  router.patch(
    '/:id',
    authorize('ADMIN'),
    upload.single('image'),
    async (request, response, next) => {
      try {
        if (request.file)
          await validateProductImage(request.file.path, request.file.mimetype);
        const values = parse(updateSchema, request.body);
        if (!request.file && Object.keys(values).length === 0)
          throw new AppError(
            400,
            'VALIDATION_ERROR',
            'Informe ao menos um campo para atualização.',
          );
        const product = await updateProduct.execute(productId(request), {
          ...values,
          ...(request.file
            ? { imageUrl: productImageUrl(request.file.filename) }
            : {}),
        });
        response.json({ data: { product }, message: null, meta: null });
      } catch (error) {
        if (request.file)
          await unlink(request.file.path).catch(() => undefined);
        next(error);
      }
    },
  );
  router.delete('/:id', authorize('ADMIN'), async (request, response, next) => {
    try {
      await deactivateProduct.execute(productId(request));
      response.json({
        data: null,
        message: 'Produto desativado com sucesso.',
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  });
  router.use('/:id/stock', createStockRouter(store));
  return router;
}
