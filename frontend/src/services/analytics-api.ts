import { apiRequest } from './api-client';
export interface Performance {
  product: { id: string; name: string; brand: string | null };
  profit?: string;
  revenue: string;
  quantitySold: number;
}
export interface BrandPerformance {
  brand: string;
  profit?: string;
  revenue: string;
  quantitySold: number;
}
export interface AnalyticsData {
  mostProfitableProducts: Performance[];
  leastProfitableProducts: Performance[];
  profitableBrands: BrandPerformance[];
  staleProducts: {
    product: { id: string; name: string };
    currentStock: number;
    lastUnitCost?: string | null;
    tiedCapital?: string | null;
    lastSaleAt: string | null;
    daysWithoutSale: number | null;
  }[];
  investedCapital?: string;
  averageMarginPercent?: string;
  criticalStock: {
    product: { id: string; name: string };
    currentStock: number;
  }[];
  outOfStock: { product: { id: string; name: string }; currentStock: number }[];
  revenueEvolution: { date: string; value: string }[];
  profitEvolution?: { date: string; value: string }[];
}
export const getAnalytics = () => apiRequest<AnalyticsData>('/analytics');
export async function getInsights() {
  return (
    (await apiRequest<{ insights: string[] }>('/analytics/insights'))
      .insights ?? []
  );
}
export interface ProductAnalytics {
  quantitySold: number;
  accumulatedProfit?: string;
  lastSaleAt: string | null;
  lastPurchaseAt?: string | null;
}
export async function getProductAnalytics(id: string) {
  return (
    await apiRequest<{ analytics: ProductAnalytics }>(
      `/products/${id}/analytics`,
    )
  ).analytics;
}
