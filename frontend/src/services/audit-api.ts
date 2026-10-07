import { apiRequest, apiRequestResponse } from './api-client';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DEACTIVATE'
  | 'STOCK_ADJUSTMENT'
  | 'STOCK_ENTRY'
  | 'SALE_CREATED'
  | 'PURCHASE_CREATED';
export type AuditEntity = 'PRODUCT' | 'STOCK' | 'SALE' | 'PURCHASE';
export interface AuditEvent {
  id: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string };
}
export interface AuditFilters {
  action?: string;
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  entityId?: string;
  page?: number;
  pageSize?: number;
}
export interface AuditMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function listAudit(filters: AuditFilters) {
  if (filters.entity && filters.entityId) {
    const data = await apiRequest<AuditEvent[]>(
      `/audit/entity/${filters.entity}/${filters.entityId}`,
    );
    return {
      data,
      meta: {
        page: 1,
        pageSize: data.length,
        total: data.length,
        totalPages: 1,
      },
    };
  }
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const response = await apiRequestResponse<AuditEvent[]>(`/audit?${params}`);
  return { data: response.data, meta: response.meta as AuditMeta };
}

export const getAudit = (id: string) => apiRequest<AuditEvent>(`/audit/${id}`);
