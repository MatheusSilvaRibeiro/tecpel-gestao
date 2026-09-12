import { useQuery } from '@tanstack/react-query';
import {
  getAnalytics,
  getInsights,
  getProductAnalytics,
} from '../services/analytics-api';
export const analyticsQueryKey = ['analytics'] as const;
export function useAnalytics() {
  return useQuery({ queryKey: analyticsQueryKey, queryFn: getAnalytics });
}
export function useInsights() {
  return useQuery({
    queryKey: [...analyticsQueryKey, 'insights'],
    queryFn: getInsights,
  });
}
export function useProductAnalytics(id: string) {
  return useQuery({
    queryKey: [...analyticsQueryKey, 'product', id],
    queryFn: () => getProductAnalytics(id),
    enabled: Boolean(id),
  });
}
