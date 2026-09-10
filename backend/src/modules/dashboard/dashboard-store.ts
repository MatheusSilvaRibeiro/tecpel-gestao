export const LOW_STOCK_THRESHOLD = 5;
export interface DashboardToday {
  revenue: string;
  cost: string;
  profit: string;
  salesCount: number;
  averageTicket: string;
}
export interface DashboardRecentSale {
  id: string;
  createdAt: Date;
  soldBy: { id: string; name: string };
  units: number;
  totalAmount: string;
  paymentMethod: 'CASH' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'OTHER';
  totalProfit: string;
}
export interface DashboardData {
  today: DashboardToday;
  stock: { activeProducts: number; outOfStock: number; lowStock: number };
  recentSales: DashboardRecentSale[];
  revenueLast7Days: { date: string; revenue: string }[];
  purchasesMonth: string;
}
export interface DashboardStore {
  read(now: Date, timezone: string): Promise<DashboardData>;
}
