import { Prisma, type PrismaClient } from '@prisma/client';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DEACTIVATE'
  | 'STOCK_ADJUSTMENT'
  | 'STOCK_ENTRY'
  | 'SALE_CREATED'
  | 'PURCHASE_CREATED';
export type AuditEntity = 'PRODUCT' | 'STOCK' | 'SALE' | 'PURCHASE';

type JsonRecord = Record<string, unknown>;
type AuditClient =
  Pick<Prisma.TransactionClient, 'auditLog'> | Pick<PrismaClient, 'auditLog'>;

export interface AuditEvent {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  before?: JsonRecord | null;
  after?: JsonRecord | null;
  metadata?: JsonRecord | null;
}

const sensitiveKeys =
  /password|passwordhash|jwt|cookie|secret|token|credential/i;

export function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditValue);
  if (value && typeof value === 'object') {
    if (value instanceof Date) return value.toISOString();
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !sensitiveKeys.test(key))
        .map(([key, item]) => [key, sanitizeAuditValue(item)]),
    );
  }
  return value;
}

function comparable(value: unknown) {
  return value === undefined ? null : JSON.stringify(sanitizeAuditValue(value));
}

export function auditDiff(before: JsonRecord, after: JsonRecord) {
  const previous: JsonRecord = {};
  const next: JsonRecord = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (
      sensitiveKeys.test(key) ||
      comparable(before[key]) === comparable(after[key])
    )
      continue;
    previous[key] = sanitizeAuditValue(before[key]);
    next[key] = sanitizeAuditValue(after[key]);
  }
  return {
    before: previous,
    after: next,
    changed: Object.keys(next).length > 0,
  };
}

function json(value: JsonRecord | null | undefined) {
  if (value == null) return Prisma.JsonNull;
  return sanitizeAuditValue(value) as Prisma.InputJsonValue;
}

export class AuditService {
  async record(client: AuditClient, event: AuditEvent) {
    return client.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        entity: event.entity,
        entityId: event.entityId,
        before: json(event.before),
        after: json(event.after),
        metadata: json(event.metadata),
      },
    });
  }
}

export interface AuditWriter {
  record(client: AuditClient, event: AuditEvent): Promise<unknown>;
}
