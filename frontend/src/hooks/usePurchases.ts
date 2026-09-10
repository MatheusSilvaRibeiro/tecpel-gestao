import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/purchases-api';

export const purchasesQueryKey = ['purchases'] as const;
export const usePurchases = (filters: api.PurchaseFilters = {}) =>
  useQuery({
    queryKey: [...purchasesQueryKey, filters],
    queryFn: () => api.listPurchases(filters),
  });
export const usePurchase = (id: string) =>
  useQuery({
    queryKey: [...purchasesQueryKey, id],
    queryFn: () => api.getPurchase(id),
    enabled: Boolean(id),
  });
export function useCreatePurchase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.createPurchase,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: purchasesQueryKey });
      await client.invalidateQueries({ queryKey: ['products'] });
      await client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
