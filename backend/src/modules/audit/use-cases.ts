import { AppError } from '../../errors/app-error.js';
import type { AuditFilters, AuditRepository } from './audit-repository.js';
import type { AuditEntity } from './audit-service.js';

export class ListAuditLogs {
  constructor(private readonly repository: AuditRepository) {}
  execute(filters: AuditFilters) {
    return this.repository.list(filters);
  }
}
export class GetAuditLog {
  constructor(private readonly repository: AuditRepository) {}
  async execute(id: string) {
    const event = await this.repository.findById(id);
    if (!event)
      throw new AppError(404, 'AUDIT_NOT_FOUND', 'Evento não encontrado.');
    return event;
  }
}
export class GetEntityAuditLogs {
  constructor(private readonly repository: AuditRepository) {}
  execute(entity: AuditEntity, entityId: string) {
    return this.repository.findByEntity(entity, entityId);
  }
}
