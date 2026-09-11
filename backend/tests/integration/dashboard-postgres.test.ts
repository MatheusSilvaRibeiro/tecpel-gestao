import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PrismaClient, UserRole } from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { PrismaUserStore } from '../../src/modules/auth/prisma-user-store.js';
import { createTokenService } from '../../src/modules/auth/token.js';
import { PrismaDashboardStore } from '../../src/modules/dashboard/prisma-dashboard-store.js';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;
const now = new Date('2026-09-06T03:30:00Z');
const tokens = createTokenService({
  secret: 'dashboard-integration-secret-32-chars',
  expiresIn: '8h',
});
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
    .withDatabase('dashboard_test')
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
});
beforeEach(async () => {
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma?.$disconnect();
  await container?.stop();
});

async function user(role: UserRole) {
  return prisma.user.create({
    data: {
      name: role === 'ADMIN' ? 'Administrador' : 'Vendedor',
      username: role.toLowerCase(),
      email: `${role.toLowerCase()}@dashboard.test`,
      passwordHash: 'unused',
      role,
    },
  });
}
async function seed() {
  const admin = await user(UserRole.ADMIN);
  const seller = await user(UserRole.VENDEDOR);
  const zero = await prisma.product.create({
    data: { name: 'Sem estoque', type: 'PERFUME', salePrice: '50.00' },
  });
  const low = await prisma.product.create({
    data: { name: 'Baixo', type: 'CREAM', salePrice: '30.00' },
  });
  const high = await prisma.product.create({
    data: { name: 'Normal', type: 'CREAM', salePrice: '40.00' },
  });
  const inactive = await prisma.product.create({
    data: { name: 'Inativo', type: 'CREAM', salePrice: '20.00', active: false },
  });
  await prisma.stockMovement.createMany({
    data: [
      {
        productId: low.id,
        createdBy: admin.id,
        type: 'ENTRY',
        quantity: 5,
        unitCost: '10.00',
      },
      {
        productId: high.id,
        createdBy: admin.id,
        type: 'ENTRY',
        quantity: 8,
        unitCost: '10.00',
      },
      {
        productId: high.id,
        createdBy: admin.id,
        type: 'ADJUSTMENT',
        quantity: -2,
        note: 'Ajuste',
      },
      {
        productId: inactive.id,
        createdBy: admin.id,
        type: 'ENTRY',
        quantity: 1,
        unitCost: '10.00',
      },
    ],
  });
  const sales = [
    {
      createdAt: new Date('2026-09-06T04:00:00Z'),
      amount: '100.00',
      cost: '60.00',
      profit: '40.00',
      units: 2,
    },
    {
      createdAt: new Date('2026-09-06T10:00:00Z'),
      amount: '200.00',
      cost: '120.00',
      profit: '80.00',
      units: 3,
    },
    {
      createdAt: new Date('2026-09-06T02:30:00Z'),
      amount: '70.00',
      cost: '40.00',
      profit: '30.00',
      units: 1,
    },
    {
      createdAt: new Date('2026-09-04T12:00:00Z'),
      amount: '40.00',
      cost: '20.00',
      profit: '20.00',
      units: 1,
    },
    {
      createdAt: new Date('2026-09-03T12:00:00Z'),
      amount: '30.00',
      cost: '15.00',
      profit: '15.00',
      units: 1,
    },
    {
      createdAt: new Date('2026-09-02T12:00:00Z'),
      amount: '20.00',
      cost: '10.00',
      profit: '10.00',
      units: 1,
    },
  ];
  await prisma.purchase.createMany({
    data: [
      {
        purchaseDate: new Date('2026-09-02T12:00:00Z'),
        totalAmount: '125.00',
        createdById: admin.id,
      },
      {
        purchaseDate: new Date('2026-08-31T12:00:00Z'),
        totalAmount: '999.00',
        createdById: admin.id,
      },
    ],
  });
  for (const sale of sales)
    await prisma.sale.create({
      data: {
        soldById: seller.id,
        paymentMethod: 'PIX',
        totalAmount: sale.amount,
        totalCost: sale.cost,
        totalProfit: sale.profit,
        createdAt: sale.createdAt,
        items: {
          create: {
            productId: zero.id,
            quantity: sale.units,
            unitPrice: sale.amount,
            unitCost: sale.cost,
            subtotal: sale.amount,
            profit: sale.profit,
          },
        },
      },
    });
  return { admin, seller };
}

describe('dashboard with PostgreSQL', () => {
  it('aggregates store-local day, real stock, recent sales and seven complete days', async () => {
    const { admin } = await seed();
    app = createApp({
      userStore: new PrismaUserStore(prisma),
      dashboardStore: new PrismaDashboardStore(prisma),
      tokenService: tokens,
      authCookie: { name: 'tecpel_auth', maxAgeMs: 1000 },
      storeTimezone: 'America/Sao_Paulo',
      now: () => now,
    });
    const response = await request(app)
      .get('/dashboard')
      .set('Cookie', `tecpel_auth=${tokens.sign(admin.id)}`)
      .expect(200);
    const data = response.body.data;
    expect(data.today).toEqual({
      revenue: '300.00',
      cost: '180.00',
      profit: '120.00',
      salesCount: 2,
      averageTicket: '150.00',
    });
    expect(data.purchasesMonth).toBe('125.00');
    expect(data.stock).toEqual({
      activeProducts: 3,
      outOfStock: 1,
      lowStock: 1,
    });
    expect(data.recentSales).toHaveLength(5);
    expect(data.recentSales[0]).toMatchObject({
      units: 3,
      totalProfit: '80.00',
    });
    expect(data.revenueLast7Days).toHaveLength(7);
    expect(data.revenueLast7Days[0].date).toBe('2026-08-31');
    expect(data.revenueLast7Days.at(-1)).toEqual({
      date: '2026-09-06',
      revenue: '300.00',
    });
    expect(
      data.revenueLast7Days.find(
        (day: { date: string }) => day.date === '2026-09-01',
      ).revenue,
    ).toBe('0.00');
    expect(
      data.revenueLast7Days.find(
        (day: { date: string }) => day.date === '2026-09-05',
      ).revenue,
    ).toBe('70.00');
  });
  it('returns zeros without sales and strips financial data for VENDEDOR', async () => {
    const seller = await user(UserRole.VENDEDOR);
    app = createApp({
      userStore: new PrismaUserStore(prisma),
      dashboardStore: new PrismaDashboardStore(prisma),
      tokenService: tokens,
      authCookie: { name: 'tecpel_auth', maxAgeMs: 1000 },
      storeTimezone: 'America/Sao_Paulo',
      now: () => now,
    });
    const response = await request(app)
      .get('/dashboard')
      .set('Cookie', `tecpel_auth=${tokens.sign(seller.id)}`)
      .expect(200);
    const data = response.body.data;
    expect(data.today).toEqual({
      revenue: '0.00',
      salesCount: 0,
      averageTicket: '0.00',
    });
    expect(data.recentSales).toEqual([]);
    expect(data.revenueLast7Days).toHaveLength(7);
    expect(JSON.stringify(data)).not.toContain('profit');
    expect(JSON.stringify(data)).not.toContain('cost');
  });
});
