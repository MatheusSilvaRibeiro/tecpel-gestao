import { apiFileUrl, apiRequest } from './api-client';
export type ReportTab = 'sales' | 'purchases' | 'stock';
export interface ReportFilters {
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
  paymentMethod?: string;
  sellerId?: string;
  supplier?: string;
  productId?: string;
  movementType?: string;
}
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface SaleReport {
  summary: {
    salesCount: number;
    revenue: string;
    averageTicket: string;
    cost?: string;
    profit?: string;
  };
  records: {
    data: Array<{
      id: string;
      createdAt: string;
      seller: { id: string; name: string };
      paymentMethod: string;
      itemsCount: number;
      totalAmount: string;
      totalCost?: string;
      totalProfit?: string;
    }>;
    meta: PageMeta;
  };
}
export interface PurchaseReport {
  summary: { purchasesCount: number; totalPurchased: string };
  records: {
    data: Array<{
      id: string;
      purchaseDate: string;
      supplierName: string | null;
      invoiceNumber: string | null;
      itemsCount: number;
      totalAmount: string;
      createdBy: { id: string; name: string };
    }>;
    meta: PageMeta;
  };
}
export interface StockReport {
  data: Array<{
    id: string;
    createdAt: string;
    product: { id: string; name: string };
    type: string;
    quantity: number;
    user: { id: string; name: string };
    note: string | null;
    purchaseId: string | null;
  }>;
  meta: PageMeta;
}
const params = (filters: ReportFilters) => {
  const value = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') value.set(k, String(v));
  });
  return value.toString();
};
export const getSalesReport = (f: ReportFilters) =>
  apiRequest<SaleReport>(`/reports/sales?${params(f)}`);
export const getPurchaseReport = (f: ReportFilters) =>
  apiRequest<PurchaseReport>(`/reports/purchases?${params(f)}`);
export const getStockReport = (f: ReportFilters) =>
  apiRequest<StockReport>(`/reports/stock-movements?${params(f)}`);
export const getPaymentMethods = (f: ReportFilters) =>
  apiRequest<
    Array<{ paymentMethod: string; salesCount: number; totalAmount: string }>
  >(`/reports/sales/payment-methods?${params(f)}`);
export const reportExportUrl = (tab: ReportTab, f: ReportFilters) =>
  apiFileUrl(
    `/reports/${tab === 'stock' ? 'stock-movements' : tab}/export?${params(f)}`,
  );
