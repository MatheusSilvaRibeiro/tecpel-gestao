import { useQuery } from '@tanstack/react-query';
import { getAudit, listAudit, type AuditFilters } from '../services/audit-api';

export function useAudit(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit', filters],
    queryFn: () => listAudit(filters),
  });
}
export function useAuditDetail(id: string | null) {
  return useQuery({
    queryKey: ['audit', id],
    queryFn: () => getAudit(id!),
    enabled: Boolean(id),
  });
}
