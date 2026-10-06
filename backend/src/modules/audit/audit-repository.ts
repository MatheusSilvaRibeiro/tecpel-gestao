import type { AuditAction, AuditEntity } from './audit-service.js';

export interface AuditFilters {
  action?: AuditAction;
  entity?: AuditEntity;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  pageSize: number;
}

export interface AuditLogView {
  id: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: Date;
  user: { id: string; name: string };
}

export interface AuditRepository {
  list(filters: AuditFilters): Promise<{
    data: AuditLogView[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }>;
  findById(id: string): Promise<AuditLogView | null>;
  findByEntity(entity: AuditEntity, entityId: string): Promise<AuditLogView[]>;
}
