import type { UserRole } from '../auth/user-store.js';
import type { DashboardStore } from './dashboard-store.js';

export class GetDashboard {
  constructor(
    private readonly store: DashboardStore,
    private readonly timezone: string,
    private readonly now: () => Date = () => new Date(),
  ) {}
  async execute(role: UserRole) {
    const dashboard = await this.store.read(this.now(), this.timezone);
    if (role === 'ADMIN') return dashboard;
    return {
      today: {
        revenue: dashboard.today.revenue,
        salesCount: dashboard.today.salesCount,
        averageTicket: dashboard.today.averageTicket,
      },
      stock: dashboard.stock,
      recentSales: dashboard.recentSales.map(
        ({ totalProfit: _profit, ...sale }) => {
          void _profit;
          return sale;
        },
      ),
      revenueLast7Days: dashboard.revenueLast7Days,
    };
  }
}
