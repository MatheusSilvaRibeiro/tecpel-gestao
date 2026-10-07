import type { PaymentMethod } from '../sales/sale-store.js';

export interface ReportPeriod {
  startDate: string;
  endDate: string;
  timezone: string;
}
export interface PageInput {
  page: number;
  pageSize: number;
}
export interface SalesReportFilters extends ReportPeriod, PageInput {
  paymentMethod?: PaymentMethod;
  sellerId?: string;
}
export interface SalesProductFilters extends ReportPeriod, PageInput {
  orderBy: 'quantity' | 'revenue' | 'profit';
  paymentMethod?: PaymentMethod;
  sellerId?: string;
}
export interface PurchaseReportFilters extends ReportPeriod, PageInput {
  supplier?: string;
}
export interface StockReportFilters extends ReportPeriod, PageInput {
  productId?: string;
  movementType?: 'ENTRY' | 'ADJUSTMENT' | 'SALE';
}
export interface PageResult<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
export interface SaleReportRow {
  id: string;
  createdAt: Date;
  seller: { id: string; name: string };
  paymentMethod: PaymentMethod;
  itemsCount: number;
  totalAmount: string;
  totalCost: string;
  totalProfit: string;
}
export interface SalesSummary {
  salesCount: number;
  revenue: string;
  cost: string;
  profit: string;
  averageTicket: string;
}
export interface ProductSoldRow {
  product: { id: string; name: string; brand: string | null };
  quantitySold: number;
  revenue: string;
  cost: string;
  profit: string;
}
export interface PaymentMethodRow {
  paymentMethod: PaymentMethod;
  salesCount: number;
  totalAmount: string;
}
export interface PurchaseReportRow {
  id: string;
  purchaseDate: Date;
  supplierName: string | null;
  invoiceNumber: string | null;
  itemsCount: number;
  totalAmount: string;
  createdBy: { id: string; name: string };
}
export interface ProductPurchasedRow {
  product: { id: string; name: string; brand: string | null };
  quantityPurchased: number;
  totalPurchased: string;
  averageUnitCost: string;
}
export interface StockMovementReportRow {
  id: string;
  createdAt: Date;
  product: { id: string; name: string };
  type: 'ENTRY' | 'ADJUSTMENT' | 'SALE';
  quantity: number;
  user: { id: string; name: string };
  note: string | null;
  purchaseId: string | null;
}
export interface ReportsRepository {
  sales(
    filters: SalesReportFilters,
  ): Promise<{ summary: SalesSummary; records: PageResult<SaleReportRow> }>;
  soldProducts(
    filters: SalesProductFilters,
  ): Promise<PageResult<ProductSoldRow>>;
  paymentMethods(period: ReportPeriod): Promise<PaymentMethodRow[]>;
  purchases(filters: PurchaseReportFilters): Promise<{
    summary: { purchasesCount: number; totalPurchased: string };
    records: PageResult<PurchaseReportRow>;
  }>;
  purchasedProducts(
    filters: PurchaseReportFilters,
  ): Promise<PageResult<ProductPurchasedRow>>;
  stockMovements(
    filters: StockReportFilters,
  ): Promise<PageResult<StockMovementReportRow>>;
}
