import { useQuery } from '@tanstack/react-query';
import {
  getPaymentMethods,
  getPurchaseReport,
  getSalesReport,
  getStockReport,
  type PurchaseReport,
  type ReportFilters,
  type ReportTab,
  type SaleReport,
  type StockReport,
} from '../services/reports-api';
export function useReport(tab: ReportTab, filters: ReportFilters) {
  return useQuery<SaleReport | PurchaseReport | StockReport>({
    queryKey: ['reports', tab, filters],
    queryFn: () =>
      tab === 'sales'
        ? getSalesReport(filters)
        : tab === 'purchases'
          ? getPurchaseReport(filters)
          : getStockReport(filters),
  });
}
export function usePaymentMethods(filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: [
      'reports',
      'payment-methods',
      filters.startDate,
      filters.endDate,
    ],
    queryFn: () => getPaymentMethods(filters),
    enabled,
  });
}
