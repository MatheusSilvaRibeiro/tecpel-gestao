import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaAnalyticsRepository } from '../../src/modules/analytics/prisma-analytics-repository.js';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;
let repository: PrismaAnalyticsRepository;
async function migrate(relativePath: string) {
  const sql = await readFile(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    'utf8',
  );
  const result = await container.exec([
    'psql',
    '-U',
    container.getUsername(),
    '-d',
    container.getDatabase(),
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    sql,
  ]);
  if (result.exitCode !== 0) throw new Error(result.stderr);
}
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('tecpel_analytics_test')
    .withUsername('tecpel_test')
    .withPassword('tecpel_test')
    .start();
  await migrate(
    '../../prisma/migrations/20260826010000_add_user_auth/migration.sql',
  );
  await migrate(
    '../../prisma/migrations/20260906010000_add_products_stock/migration.sql',
  );
  await migrate(
    '../../prisma/migrations/20260906020000_add_sales/migration.sql',
  );
  await migrate(
    '../../prisma/migrations/20260910010000_add_purchases/migration.sql',
  );
  process.env.DATABASE_URL = container.getConnectionUri();
  prisma = new PrismaClient();
  repository = new PrismaAnalyticsRepository(prisma);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      username: 'admin',
      email: 'admin@analytics.test',
      passwordHash: 'x',
      role: 'ADMIN',
    },
  });
  const kaiak = await prisma.product.create({
    data: {
      name: 'Kaiak',
      brand: 'Natura',
      type: 'PERFUME',
      salePrice: '60.00',
    },
  });
  const humor = await prisma.product.create({
    data: {
      name: 'Humor',
      brand: 'Natura',
      type: 'PERFUME',
      salePrice: '50.00',
    },
  });
  const stale = await prisma.product.create({
    data: {
      name: 'Produto parado',
      brand: 'Avon',
      type: 'CREAM',
      salePrice: '30.00',
    },
  });
  await prisma.product.create({
    data: { name: 'Sem estoque', type: 'CREAM', salePrice: '20.00' },
  });
  const purchase = await prisma.purchase.create({
    data: {
      purchaseDate: new Date('2026-08-01T12:00:00Z'),
      totalAmount: '150.00',
      createdById: admin.id,
    },
  });
  const purchaseItems = await Promise.all(
    [
      [kaiak.id, 5, '20.00'],
      [stale.id, 5, '10.00'],
    ].map(([productId, quantity, unitCost]) =>
      prisma.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: String(productId),
          quantity: Number(quantity),
          unitCost: String(unitCost),
          subtotal: String(Number(quantity) * Number(unitCost)),
        },
      }),
    ),
  );
  await prisma.stockMovement.createMany({
    data: [
      {
        productId: kaiak.id,
        type: 'ENTRY',
        quantity: 5,
        unitCost: '20.00',
        createdBy: admin.id,
        purchaseItemId: purchaseItems[0]!.id,
      },
      {
        productId: stale.id,
        type: 'ENTRY',
        quantity: 5,
        unitCost: '10.00',
        createdBy: admin.id,
        purchaseItemId: purchaseItems[1]!.id,
      },
    ],
  });
  const saleOne = await prisma.sale.create({
    data: {
      soldById: admin.id,
      paymentMethod: 'PIX',
      totalAmount: '120.00',
      totalCost: '40.00',
      totalProfit: '80.00',
      createdAt: new Date('2026-09-12T14:00:00Z'),
    },
  });
  const saleTwo = await prisma.sale.create({
    data: {
      soldById: admin.id,
      paymentMethod: 'CASH',
      totalAmount: '50.00',
      totalCost: '45.00',
      totalProfit: '5.00',
      createdAt: new Date('2026-09-10T14:00:00Z'),
    },
  });
  await prisma.saleItem.createMany({
    data: [
      {
        saleId: saleOne.id,
        productId: kaiak.id,
        quantity: 2,
        unitPrice: '60.00',
        unitCost: '20.00',
        subtotal: '120.00',
        profit: '80.00',
      },
      {
        saleId: saleTwo.id,
        productId: humor.id,
        quantity: 1,
        unitPrice: '50.00',
        unitCost: '45.00',
        subtotal: '50.00',
        profit: '5.00',
      },
    ],
  });
  await prisma.stockMovement.createMany({
    data: [
      {
        productId: kaiak.id,
        type: 'SALE',
        quantity: -2,
        unitCost: '20.00',
        createdBy: admin.id,
      },
      {
        productId: humor.id,
        type: 'SALE',
        quantity: -1,
        unitCost: '45.00',
        createdBy: admin.id,
      },
    ],
  });
});
afterAll(async () => {
  await prisma?.$disconnect();
  await container?.stop();
});
describe('analytics with PostgreSQL', () => {
  it('aggregates products, brands, weighted margin, capital and stock alerts', async () => {
    const data = await repository.getAnalytics(
      new Date('2026-09-12T18:00:00Z'),
      'America/Sao_Paulo',
    );
    expect(data.mostProfitableProducts[0]).toMatchObject({
      product: { name: 'Kaiak' },
      profit: '80.00',
      revenue: '120.00',
      quantitySold: 2,
    });
    expect(data.leastProfitableProducts[0]).toMatchObject({
      product: { name: 'Humor' },
      profit: '5.00',
    });
    expect(data.profitableBrands[0]).toMatchObject({
      brand: 'Natura',
      profit: '85.00',
      revenue: '170.00',
      quantitySold: 3,
    });
    expect(data.averageMarginPercent).toBe('50.00');
    expect(data.investedCapital).toBe('110.00');
    expect(data.outOfStock.map((item) => item.product.name)).toContain(
      'Sem estoque',
    );
    expect(data.criticalStock[0]?.currentStock).toBeLessThanOrEqual(5);
  });
  it('finds products without sales for 90 days and calculates tied capital', async () => {
    const data = await repository.getAnalytics(
      new Date('2026-09-12T18:00:00Z'),
      'America/Sao_Paulo',
    );
    expect(
      data.staleProducts.find((item) => item.product.name === 'Produto parado'),
    ).toMatchObject({
      currentStock: 5,
      lastUnitCost: '10.00',
      tiedCapital: '50.00',
      lastSaleAt: null,
      daysWithoutSale: null,
    });
  });
  it('returns 30 complete days including zero days for revenue and profit', async () => {
    const data = await repository.getAnalytics(
      new Date('2026-09-12T18:00:00Z'),
      'America/Sao_Paulo',
    );
    expect(data.revenueEvolution).toHaveLength(30);
    expect(data.profitEvolution).toHaveLength(30);
    expect(data.revenueEvolution[0]).toEqual({
      date: '2026-08-14',
      value: '0.00',
    });
    expect(data.revenueEvolution.at(-1)).toEqual({
      date: '2026-09-12',
      value: '120.00',
    });
    expect(data.profitEvolution.at(-1)?.value).toBe('80.00');
  });
  it('returns product totals and last sale and purchase dates', async () => {
    const product = await prisma.product.findFirstOrThrow({
      where: { name: 'Kaiak' },
    });
    expect(await repository.getProductAnalytics(product.id)).toMatchObject({
      quantitySold: 2,
      accumulatedProfit: '80.00',
      lastSaleAt: new Date('2026-09-12T14:00:00Z'),
      lastPurchaseAt: new Date('2026-08-01T12:00:00Z'),
    });
  });
  it('returns zero indicators and complete series for an empty database', async () => {
    await prisma.stockMovement.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.purchaseItem.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.product.deleteMany();
    const data = await repository.getAnalytics(
      new Date('2026-09-12T18:00:00Z'),
      'America/Sao_Paulo',
    );
    expect(data.investedCapital).toBe('0.00');
    expect(data.averageMarginPercent).toBe('0.00');
    expect(data.revenueEvolution).toHaveLength(30);
    expect(data.revenueEvolution.every((item) => item.value === '0.00')).toBe(
      true,
    );
  });
});
