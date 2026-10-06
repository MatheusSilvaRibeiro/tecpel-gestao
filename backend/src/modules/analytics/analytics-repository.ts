export interface ProductPerformance {
  product: { id: string; name: string; brand: string | null };
  profit: string;
  revenue: string;
  quantitySold: number;
}
export interface BrandPerformance {
  brand: string;
  profit: string;
  revenue: string;
  quantitySold: number;
}
export interface StaleProduct {
  product: { id: string; name: string };
  currentStock: number;
  lastUnitCost: string | null;
  tiedCapital: string | null;
  lastSaleAt: Date | null;
  daysWithoutSale: number | null;
}
export interface StockAlert {
  product: { id: string; name: string };
  currentStock: number;
}
export interface ProductAnalytics {
  quantitySold: number;
  accumulatedProfit: string;
  lastSaleAt: Date | null;
  lastPurchaseAt: Date | null;
}
export interface AnalyticsData {
  mostProfitableProducts: ProductPerformance[];
  leastProfitableProducts: ProductPerformance[];
  profitableBrands: BrandPerformance[];
  staleProducts: StaleProduct[];
  investedCapital: string;
  averageMarginPercent: string;
  criticalStock: StockAlert[];
  outOfStock: StockAlert[];
  revenueEvolution: { date: string; value: string }[];
  profitEvolution: { date: string; value: string }[];
}
export interface AnalyticsRepository {
  getAnalytics(now: Date, timezone: string): Promise<AnalyticsData>;
  getProductAnalytics(productId: string): Promise<ProductAnalytics>;
}
