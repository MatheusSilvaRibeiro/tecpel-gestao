import { apiRequest } from './api-client';
import type { PaymentMethod } from './sales-api';

export interface DashboardData {
  purchasesMonth?: string;
  today: {
    revenue: string;
    cost?: string;
    profit?: string;
    salesCount: number;
    averageTicket: string;
  };
  stock: { activeProducts: number; outOfStock: number; lowStock: number };
  recentSales: {
    id: string;
    createdAt: string;
    soldBy: { id: string; name: string };
    units: number;
    totalAmount: string;
    paymentMethod: PaymentMethod;
    totalProfit?: string;
  }[];
  revenueLast7Days: { date: string; revenue: string }[];
}
export const getDashboard = () => apiRequest<DashboardData>('/dashboard');
