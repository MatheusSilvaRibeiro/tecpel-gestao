import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../../errors/app-error.js';
import { authorize } from '../auth/authorize.js';
import type { AuditRepository } from './audit-repository.js';
import { GetAuditLog, GetEntityAuditLogs, ListAuditLogs } from './use-cases.js';

const action = z.enum([
  'CREATE',
  'UPDATE',
  'DEACTIVATE',
  'STOCK_ADJUSTMENT',
  'STOCK_ENTRY',
  'SALE_CREATED',
  'PURCHASE_CREATED',
]);
const entity = z.enum(['PRODUCT', 'STOCK', 'SALE', 'PURCHASE']);
const query = z.object({
  action: action.optional(),
  entity: entity.optional(),
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AppError(
      400,
      'INVALID_AUDIT_FILTER',
      'Filtros de auditoria inválidos.',
    );
  return result.data;
}
function param(value: string | string[] | undefined) {
  if (typeof value !== 'string')
    throw new AppError(400, 'INVALID_AUDIT_ID', 'Identificador inválido.');
  return value;
}
export function createAuditRouter(
  repository: AuditRepository,
  authenticate: RequestHandler,
) {
  const router = Router();
  const list = new ListAuditLogs(repository);
  const get = new GetAuditLog(repository);
  const byEntity = new GetEntityAuditLogs(repository);
  router.use(authenticate, authorize('ADMIN'));
  router.get('/', async (request, response, next) => {
    try {
      const result = await list.execute(parse(query, request.query));
      response.json({ data: result.data, message: null, meta: result.meta });
    } catch (error) {
      next(error);
    }
  });
  router.get('/entity/:entity/:entityId', async (request, response, next) => {
    try {
      const entityValue = parse(entity, request.params.entity);
      const events = await byEntity.execute(
        entityValue,
        param(request.params.entityId),
      );
      response.json({ data: events, message: null, meta: null });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:id', async (request, response, next) => {
    try {
      response.json({
        data: await get.execute(param(request.params.id)),
        message: null,
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
