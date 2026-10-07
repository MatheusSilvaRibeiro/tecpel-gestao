import { Router, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../errors/app-error.js';
import { authorize } from '../auth/authorize.js';
import type { ReportsRepository } from './reports-repository.js';
import { ReportsService } from './reports-service.js';

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const parsed = new Date(`${v}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === v
    );
  });
const base = z
  .object({
    startDate: date,
    endDate: date,
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  })
  .superRefine((v, ctx) => {
    const start = new Date(`${v.startDate}T00:00:00Z`),
      end = new Date(`${v.endDate}T00:00:00Z`);
    if (start > end)
      ctx.addIssue({ code: 'custom', message: 'Período inválido.' });
    if (end.valueOf() - start.valueOf() > 366 * 86400000)
      ctx.addIssue({
        code: 'custom',
        message: 'O período máximo é de 366 dias.',
      });
  });
const sales = base.and(
  z.object({
    paymentMethod: z
      .enum(['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER'])
      .optional(),
    sellerId: z.string().uuid().optional(),
  }),
);
const products = base.and(
  z.object({
    paymentMethod: z
      .enum(['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER'])
      .optional(),
    sellerId: z.string().uuid().optional(),
    orderBy: z.enum(['quantity', 'revenue', 'profit']).default('quantity'),
  }),
);
const purchases = base.and(
  z.object({ supplier: z.string().trim().max(120).optional() }),
);
const stock = base.and(
  z.object({
    productId: z.string().uuid().optional(),
    movementType: z.enum(['ENTRY', 'ADJUSTMENT', 'SALE']).optional(),
  }),
);
const parse = <T>(
  schema: z.ZodType<T>,
  value: unknown,
  timezone: string,
): T & { timezone: string } => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AppError(
      400,
      'INVALID_REPORT_FILTER',
      'Período ou filtros de relatório inválidos.',
    );
  return { ...result.data, timezone };
};
const sendCsv = (response: Response, name: string, body: string) =>
  response
    .status(200)
    .set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}.csv"`,
    })
    .send(body);
export function createReportsRouter(
  repository: ReportsRepository,
  authenticate: RequestHandler,
  timezone: string,
) {
  const router = Router(),
    service = new ReportsService(repository);
  router.use(authenticate, authorize('ADMIN', 'VENDEDOR'));
  router.get('/sales', async (req, res, next) => {
    try {
      res.json({
        data: await service.sales(
          parse(sales, req.query, timezone),
          req.authUser.role,
        ),
        message: null,
        meta: null,
      });
    } catch (e) {
      next(e);
    }
  });
  router.get('/sales/products', async (req, res, next) => {
    try {
      const f = parse(products, req.query, timezone);
      if (req.authUser.role !== 'ADMIN' && f.orderBy === 'profit')
        throw new AppError(
          403,
          'FORBIDDEN',
          'Você não tem permissão para ordenar por lucro.',
        );
      res.json({
        data: await service.soldProducts(f, req.authUser.role),
        message: null,
        meta: null,
      });
    } catch (e) {
      next(e);
    }
  });
  router.get('/sales/payment-methods', async (req, res, next) => {
    try {
      res.json({
        data: await service.paymentMethods(parse(sales, req.query, timezone)),
        message: null,
        meta: null,
      });
    } catch (e) {
      next(e);
    }
  });
  router.get('/sales/export', async (req, res, next) => {
    try {
      sendCsv(
        res,
        'relatorio-vendas',
        await service.salesCsv(
          parse(sales, req.query, timezone),
          req.authUser.role,
        ),
      );
    } catch (e) {
      next(e);
    }
  });
  router.get('/purchases', authorize('ADMIN'), async (req, res, next) => {
    try {
      res.json({
        data: await service.purchases(parse(purchases, req.query, timezone)),
        message: null,
        meta: null,
      });
    } catch (e) {
      next(e);
    }
  });
  router.get(
    '/purchases/products',
    authorize('ADMIN'),
    async (req, res, next) => {
      try {
        res.json({
          data: await service.purchasedProducts(
            parse(purchases, req.query, timezone),
          ),
          message: null,
          meta: null,
        });
      } catch (e) {
        next(e);
      }
    },
  );
  router.get(
    '/purchases/export',
    authorize('ADMIN'),
    async (req, res, next) => {
      try {
        sendCsv(
          res,
          'relatorio-compras',
          await service.purchasesCsv(parse(purchases, req.query, timezone)),
        );
      } catch (e) {
        next(e);
      }
    },
  );
  router.get('/stock-movements', async (req, res, next) => {
    try {
      res.json({
        data: await service.stockMovements(parse(stock, req.query, timezone)),
        message: null,
        meta: null,
      });
    } catch (e) {
      next(e);
    }
  });
  router.get('/stock-movements/export', async (req, res, next) => {
    try {
      sendCsv(
        res,
        'relatorio-estoque',
        await service.stockCsv(parse(stock, req.query, timezone)),
      );
    } catch (e) {
      next(e);
    }
  });
  return router;
}
