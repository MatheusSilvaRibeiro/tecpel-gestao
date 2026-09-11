import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from '../services/products-api';

export const productsQueryKey = ['products'] as const;
export function useProducts(filters: api.ProductFilters) {
  return useQuery({
    queryKey: [...productsQueryKey, filters],
    queryFn: () => api.listProducts(filters),
  });
}
export function useProduct(id: string) {
  return useQuery({
    queryKey: [...productsQueryKey, id],
    queryFn: () => api.getProduct(id),
    enabled: Boolean(id),
  });
}
export function useProductStock(id: string) {
  return useQuery({
    queryKey: [...productsQueryKey, id, 'stock'],
    queryFn: () => api.getProductStock(id),
    enabled: Boolean(id),
  });
}
export function useProductCost(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...productsQueryKey, id, 'cost'],
    queryFn: () => api.getProductCost(id),
    enabled: Boolean(id) && enabled,
  });
}
export function useProductMutations(id?: string) {
  const client = useQueryClient();
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: productsQueryKey });
  };
  return {
    create: useMutation({ mutationFn: api.createProduct, onSuccess: refresh }),
    update: useMutation({
      mutationFn: (input: Record<string, string | File | null | undefined>) =>
        api.updateProduct(id!, input),
      onSuccess: refresh,
    }),
    deactivate: useMutation({
      mutationFn: () => api.deactivateProduct(id!),
      onSuccess: refresh,
    }),
    entry: useMutation({
      mutationFn: (input: { quantity: number; unitCost: string }) =>
        api.registerEntry(id!, input),
      onSuccess: refresh,
    }),
    adjustment: useMutation({
      mutationFn: (input: { quantity: number; note: string }) =>
        api.registerAdjustment(id!, input),
      onSuccess: refresh,
    }),
  };
}
