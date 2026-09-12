import { describe, expect, it } from 'vitest';
import type {
  AnalyticsData,
  AnalyticsRepository,
} from '../src/modules/analytics/analytics-repository.js';
import { AnalyticsService } from '../src/modules/analytics/analytics-service.js';

const data: AnalyticsData = {
  mostProfitableProducts: [
    {
      product: { id: '1', name: 'Kaiak', brand: 'Natura' },
      profit: '5.00',
      revenue: '100.00',
      quantitySold: 2,
    },
  ],
  leastProfitableProducts: [
    {
      product: { id: '1', name: 'Kaiak', brand: 'Natura' },
      profit: '5.00',
      revenue: '100.00',
      quantitySold: 2,
    },
  ],
  profitableBrands: [
    { brand: 'Natura', profit: '5.00', revenue: '100.00', quantitySold: 2 },
  ],
  staleProducts: [
    {
      product: { id: '2', name: 'Parado' },
      currentStock: 4,
      lastUnitCost: '20.00',
      tiedCapital: '80.00',
      lastSaleAt: new Date('2026-05-01'),
      daysWithoutSale: 134,
    },
  ],
  investedCapital: '80.00',
  averageMarginPercent: '5.00',
  criticalStock: [{ product: { id: '2', name: 'Parado' }, currentStock: 4 }],
  outOfStock: [],
  revenueEvolution: [{ date: '2026-09-12', value: '0.00' }],
  profitEvolution: [{ date: '2026-09-12', value: '0.00' }],
};
class Repository implements AnalyticsRepository {
  getAnalytics() {
    return Promise.resolve(data);
  }
  getProductAnalytics() {
    return Promise.resolve({
      quantitySold: 2,
      accumulatedProfit: '5.00',
      lastSaleAt: null,
      lastPurchaseAt: null,
    });
  }
}
describe('AnalyticsService', () => {
  const service = new AnalyticsService(
    new Repository(),
    'America/Sao_Paulo',
    () => new Date('2026-09-12T12:00:00Z'),
  );
  it('returns all financial indicators to ADMIN and generates deterministic insights', async () => {
    expect(await service.get('ADMIN')).toEqual(data);
    const insights = await service.insights('ADMIN');
    expect(insights).toContain('Parado está há 134 dias sem vendas.');
    expect(insights).toContain('Parado possui apenas 4 unidades em estoque.');
    expect(insights).toContain('Kaiak possui margem inferior a 10%.');
    expect(insights).toContain(
      'A marca Natura representa 100% do faturamento.',
    );
  });
  it('removes costs, profit, capital, margin and profit evolution for VENDEDOR', async () => {
    const result = await service.get('VENDEDOR');
    expect(result).not.toHaveProperty('investedCapital');
    expect(result).not.toHaveProperty('averageMarginPercent');
    expect(result).not.toHaveProperty('profitEvolution');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('lastUnitCost');
    expect(serialized).not.toContain('tiedCapital');
    expect(serialized).not.toContain('"profit"');
    const insights = await service.insights('VENDEDOR');
    expect(insights.join(' ')).not.toContain('marg');
    expect(insights.join(' ')).not.toContain('investidos');
  });
});
