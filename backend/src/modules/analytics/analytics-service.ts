import type { UserRole } from '../auth/user-store.js';
import type {
  AnalyticsRepository,
  BrandPerformance,
  ProductPerformance,
  StaleProduct,
} from './analytics-repository.js';

const brl = (value: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
export class AnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly timezone: string,
    private readonly now: () => Date = () => new Date(),
  ) {}
  async get(role: UserRole) {
    const data = await this.repository.getAnalytics(this.now(), this.timezone);
    if (role === 'ADMIN') return data;
    const product = ({ profit: _profit, ...value }: ProductPerformance) => {
      void _profit;
      return value;
    };
    const brand = ({ profit: _profit, ...value }: BrandPerformance) => {
      void _profit;
      return value;
    };
    const stale = ({
      lastUnitCost: _cost,
      tiedCapital: _capital,
      ...value
    }: StaleProduct) => {
      void _cost;
      void _capital;
      return value;
    };
    return {
      mostProfitableProducts: data.mostProfitableProducts.map(product),
      leastProfitableProducts: data.leastProfitableProducts.map(product),
      profitableBrands: data.profitableBrands.map(brand),
      staleProducts: data.staleProducts.map(stale),
      criticalStock: data.criticalStock,
      outOfStock: data.outOfStock,
      revenueEvolution: data.revenueEvolution,
    };
  }
  async insights(role: UserRole) {
    const data = await this.repository.getAnalytics(this.now(), this.timezone);
    const messages: string[] = [];
    data.staleProducts
      .slice(0, 5)
      .forEach((item) =>
        messages.push(
          item.daysWithoutSale === null
            ? `${item.product.name} nunca teve venda.`
            : `${item.product.name} está há ${item.daysWithoutSale} dias sem vendas.`,
        ),
      );
    data.criticalStock
      .filter((item) => item.currentStock > 0)
      .slice(0, 5)
      .forEach((item) =>
        messages.push(
          `${item.product.name} possui apenas ${item.currentStock} unidades em estoque.`,
        ),
      );
    if (role === 'ADMIN') {
      const tied = data.staleProducts.reduce(
        (sum, item) => sum + Number(item.tiedCapital ?? 0),
        0,
      );
      if (tied > 0)
        messages.push(
          `Você possui ${brl(tied.toFixed(2))} investidos em produtos sem venda há mais de 90 dias.`,
        );
      data.mostProfitableProducts
        .filter(
          (item) =>
            Number(item.revenue) > 0 &&
            Number(item.profit) / Number(item.revenue) < 0.1,
        )
        .slice(0, 5)
        .forEach((item) =>
          messages.push(`${item.product.name} possui margem inferior a 10%.`),
        );
      const revenue = data.profitableBrands.reduce(
        (sum, item) => sum + Number(item.revenue),
        0,
      );
      const dominant = data.profitableBrands[0];
      if (dominant && revenue > 0)
        messages.push(
          `A marca ${dominant.brand} representa ${Math.round((Number(dominant.revenue) / revenue) * 100)}% do faturamento.`,
        );
    }
    return messages;
  }
}
