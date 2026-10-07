import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaReportsRepository } from '../../src/modules/reports/prisma-reports-repository.js';
import { applyPrismaMigrations } from './helpers/apply-prisma-migrations.js';

let container: StartedPostgreSqlContainer,
  prisma: PrismaClient,
  repository: PrismaReportsRepository;
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('reports_test')
    .withUsername('tecpel_test')
    .withPassword('tecpel_test')
    .start();
  await applyPrismaMigrations(container);
  process.env.DATABASE_URL = container.getConnectionUri();
  prisma = new PrismaClient();
  repository = new PrismaReportsRepository(prisma);
  const user = await prisma.user.create({
    data: {
      name: 'Admin',
      username: 'reports',
      email: 'reports@test.local',
      passwordHash: 'x',
      role: 'ADMIN',
    },
  });
  const product = await prisma.product.create({
    data: {
      name: 'Kaiak',
      brand: 'Natura',
      type: 'PERFUME',
      salePrice: '100.00',
    },
  });
  const purchase = await prisma.purchase.create({
    data: {
      purchaseDate: new Date('2026-10-01T13:00:00Z'),
      supplierName: 'Natura',
      invoiceNumber: 'NF-1',
      totalAmount: '60.00',
      createdById: user.id,
    },
  });
  const purchased = await prisma.purchaseItem.create({
    data: {
      purchaseId: purchase.id,
      productId: product.id,
      quantity: 2,
      unitCost: '30.00',
      subtotal: '60.00',
    },
  });
  await prisma.stockMovement.create({
    data: {
      productId: product.id,
      type: 'ENTRY',
      quantity: 2,
      unitCost: '30.00',
      createdBy: user.id,
      purchaseItemId: purchased.id,
    },
  });
  const sale = await prisma.sale.create({
    data: {
      soldById: user.id,
      paymentMethod: 'PIX',
      totalAmount: '100.00',
      totalCost: '30.00',
      totalProfit: '70.00',
      createdAt: new Date('2026-10-02T02:30:00Z'),
    },
  });
  await prisma.saleItem.create({
    data: {
      saleId: sale.id,
      productId: product.id,
      quantity: 1,
      unitPrice: '100.00',
      unitCost: '30.00',
      subtotal: '100.00',
      profit: '70.00',
    },
  });
  await prisma.stockMovement.create({
    data: {
      productId: product.id,
      type: 'SALE',
      quantity: -1,
      createdBy: user.id,
      createdAt: new Date('2026-10-02T02:30:00Z'),
    },
  });
});
afterAll(async () => {
  await prisma?.$disconnect();
  await container?.stop();
});
const base = {
  startDate: '2026-10-01',
  endDate: '2026-10-01',
  timezone: 'America/Sao_Paulo',
  page: 1,
  pageSize: 20,
};
describe('reports with PostgreSQL', () => {
  it('uses store-local dates, frozen values, sums, groups and pagination', async () => {
    const sales = await repository.sales(base);
    expect(sales.summary).toMatchObject({
      salesCount: 1,
      revenue: '100.00',
      cost: '30.00',
      profit: '70.00',
      averageTicket: '100.00',
    });
    expect(sales.records.meta.total).toBe(1);
    expect(
      (await repository.soldProducts({ ...base, orderBy: 'quantity' })).data[0],
    ).toMatchObject({ quantitySold: 1, revenue: '100.00', profit: '70.00' });
    expect(await repository.paymentMethods(base)).toEqual([
      { paymentMethod: 'PIX', salesCount: 1, totalAmount: '100.00' },
    ]);
  });
  it('reports purchases and stock filters without loading all rows', async () => {
    const purchases = await repository.purchases({ ...base, supplier: 'Nat' });
    expect(purchases.summary).toEqual({
      purchasesCount: 1,
      totalPurchased: '60.00',
    });
    expect(
      (await repository.purchasedProducts({ ...base, supplier: 'Natura' }))
        .data[0],
    ).toMatchObject({ quantityPurchased: 2, averageUnitCost: '30.00' });
    expect(
      (await repository.stockMovements({ ...base, movementType: 'SALE' })).data,
    ).toHaveLength(1);
  });
  it('returns zero summaries for an empty period', async () => {
    expect(
      (
        await repository.sales({
          ...base,
          startDate: '2025-01-01',
          endDate: '2025-01-02',
        })
      ).summary,
    ).toMatchObject({ salesCount: 0, revenue: '0.00', averageTicket: '0.00' });
  });
});
