import { describe, expect, it } from 'vitest';
import type { ReportsRepository } from '../src/modules/reports/reports-repository.js';
import { ReportsService } from '../src/modules/reports/reports-service.js';

const meta = { page: 1, pageSize: 20, total: 1, totalPages: 1 };
const repository: ReportsRepository = {
  async sales() {
    return {
      summary: {
        salesCount: 1,
        revenue: '100.00',
        cost: '60.00',
        profit: '40.00',
        averageTicket: '100.00',
      },
      records: {
        meta,
        data: [
          {
            id: 'sale',
            createdAt: new Date('2026-10-01T13:00:00Z'),
            seller: { id: 'user', name: 'João; "Loja"' },
            paymentMethod: 'PIX',
            itemsCount: 2,
            totalAmount: '100.00',
            totalCost: '60.00',
            totalProfit: '40.00',
          },
        ],
      },
    };
  },
  async soldProducts() {
    return {
      meta,
      data: [
        {
          product: { id: 'product', name: 'Kaiak', brand: 'Natura' },
          quantitySold: 2,
          revenue: '100.00',
          cost: '60.00',
          profit: '40.00',
        },
      ],
    };
  },
  async paymentMethods() {
    return [{ paymentMethod: 'PIX', salesCount: 1, totalAmount: '100.00' }];
  },
  async purchases() {
    return {
      summary: { purchasesCount: 0, totalPurchased: '0.00' },
      records: { meta: { ...meta, total: 0, totalPages: 0 }, data: [] },
    };
  },
  async purchasedProducts() {
    return { meta: { ...meta, total: 0, totalPages: 0 }, data: [] };
  },
  async stockMovements() {
    return { meta: { ...meta, total: 0, totalPages: 0 }, data: [] };
  },
};
const filters = {
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  timezone: 'America/Sao_Paulo',
  page: 1,
  pageSize: 20,
} as const;
describe('ReportsService', () => {
  it('removes frozen cost and profit from seller responses', async () => {
    const result = await new ReportsService(repository).sales(
      filters,
      'VENDEDOR',
    );
    expect(result.summary).not.toHaveProperty('cost');
    expect(result.records.data[0]).not.toHaveProperty('totalProfit');
  });
  it('keeps financial data for administrators', async () => {
    const result = await new ReportsService(repository).sales(filters, 'ADMIN');
    expect(result.summary).toMatchObject({ cost: '60.00', profit: '40.00' });
  });
  it('creates Brazilian UTF-8 CSV with escaped fields and role visibility', async () => {
    const service = new ReportsService(repository),
      seller = await service.salesCsv(filters, 'VENDEDOR'),
      admin = await service.salesCsv(filters, 'ADMIN');
    expect(seller.startsWith('\uFEFF')).toBe(true);
    expect(seller).toContain('"João; ""Loja"""');
    expect(seller).not.toContain('"Custo"');
    expect(admin).toContain('"Custo";"Lucro"');
  });
});
