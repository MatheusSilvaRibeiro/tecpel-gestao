import type { PrismaClient } from '@prisma/client';
import type { AuditFilters, AuditRepository } from './audit-repository.js';

const include = { user: { select: { id: true, name: true } } } as const;

export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: AuditFilters) {
    const where = {
      action: filters.action,
      entity: filters.entity,
      userId: filters.userId,
      createdAt:
        filters.startDate || filters.endDate
          ? { gte: filters.startDate, lte: filters.endDate }
          : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize),
      },
    };
  }

  findById(id: string) {
    return this.prisma.auditLog.findUnique({ where: { id }, include });
  }

  findByEntity(entity: AuditFilters['entity'], entityId: string) {
    if (!entity) return Promise.resolve([]);
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
}
