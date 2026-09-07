import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
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
import { PrismaProductStore } from '../../src/modules/products/prisma-product-store.js';
import { PrismaSaleStore } from '../../src/modules/sales/prisma-sale-store.js';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;
let uploadDirectory: string;
const tokens = createTokenService({
  secret: 'sales-integration-secret-with-at-least-32-chars',
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
    .withDatabase('tecpel_sales_test')
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
  process.env.DATABASE_URL = container.getConnectionUri();
  prisma = new PrismaClient();
  uploadDirectory = await mkdtemp(path.join(tmpdir(), 'tecpel-sales-'));
  app = createApp({
    userStore: new PrismaUserStore(prisma),
    productStore: new PrismaProductStore(prisma),
    saleStore: new PrismaSaleStore(prisma),
    tokenService: tokens,
    authCookie: { name: 'tecpel_auth', maxAgeMs: 1000 },
    uploadDirectory,
  });
});
beforeEach(async () => {
  await prisma.stockMovement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma?.$disconnect();
  await container?.stop();
  if (uploadDirectory)
    await rm(uploadDirectory, { recursive: true, force: true });
});

async function fixture(role: UserRole = UserRole.ADMIN) {
  const user = await prisma.user.create({
    data: {
      name: role === 'ADMIN' ? 'Administrador' : 'Vendedor',
      username: role.toLowerCase(),
      email: `${role.toLowerCase()}@test.local`,
      passwordHash: 'unused',
      role,
    },
  });
  const product = await prisma.product.create({
    data: { name: 'Kaiak', type: 'PERFUME', salePrice: '60.00' },
  });
  return { user, product, cookie: `tecpel_auth=${tokens.sign(user.id)}` };
}
async function entry(
  productId: string,
  userId: string,
  quantity: number,
  unitCost: string,
) {
  await prisma.stockMovement.create({
    data: { productId, createdBy: userId, type: 'ENTRY', quantity, unitCost },
  });
}

describe('sales with PostgreSQL', () => {
  it('creates a sale, freezes weighted average cost and profit, and decreases stock with SALE', async () => {
    const { user, product, cookie } = await fixture();
    await entry(product.id, user.id, 10, '30.00');
    await entry(product.id, user.id, 10, '40.00');
    const response = await request(app)
      .post('/sales')
      .set('Cookie', cookie)
      .send({
        paymentMethod: 'PIX',
        items: [{ productId: product.id, quantity: 2 }],
      })
      .expect(201);
    expect(response.body.data.sale).toMatchObject({
      totalAmount: '120.00',
      totalCost: '70.00',
      totalProfit: '50.00',
      items: [{ quantity: 2, unitCost: '35.00', profit: '50.00' }],
    });
    const movements = await prisma.stockMovement.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(movements.at(-1)).toMatchObject({ type: 'SALE', quantity: -2 });
    expect(movements.at(-1)?.unitCost?.toFixed(2)).toBe('35.00');
  });

  it('creates multiple items atomically and returns list/detail filters', async () => {
    const { user, product, cookie } = await fixture();
    const second = await prisma.product.create({
      data: { name: 'Tododia', type: 'CREAM', salePrice: '25.00' },
    });
    await entry(product.id, user.id, 5, '20.00');
    await entry(second.id, user.id, 4, '10.00');
    const created = await request(app)
      .post('/sales')
      .set('Cookie', cookie)
      .send({
        paymentMethod: 'CASH',
        items: [
          { productId: product.id, quantity: 2, unitPrice: '55.00' },
          { productId: second.id, quantity: 3 },
        ],
      })
      .expect(201);
    expect(created.body.data.sale).toMatchObject({
      totalAmount: '185.00',
      totalCost: '70.00',
      totalProfit: '115.00',
    });
    expect(created.body.data.sale.items).toHaveLength(2);
    const listed = await request(app)
      .get(`/sales?paymentMethod=CASH&soldById=${user.id}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(listed.body.data.sales).toHaveLength(1);
    const detail = await request(app)
      .get(`/sales/${created.body.data.sale.id}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(detail.body.data.sale.items).toHaveLength(2);
  });

  it('ignores a seller-provided price and uses the product sale price', async () => {
    const { user, product, cookie } = await fixture(UserRole.VENDEDOR);
    await entry(product.id, user.id, 2, '30.00');
    const response = await request(app)
      .post('/sales')
      .set('Cookie', cookie)
      .send({
        paymentMethod: 'OTHER',
        items: [{ productId: product.id, quantity: 1, unitPrice: '1.00' }],
      })
      .expect(201);
    expect(response.body.data.sale.items[0].unitPrice).toBe('60.00');
  });

  it('rejects insufficient stock and rolls back sale, items, and movements', async () => {
    const { user, product, cookie } = await fixture();
    await entry(product.id, user.id, 1, '30.00');
    await request(app)
      .post('/sales')
      .set('Cookie', cookie)
      .send({
        paymentMethod: 'PIX',
        items: [{ productId: product.id, quantity: 2 }],
      })
      .expect(409)
      .expect(({ body }) =>
        expect(body.error).toMatchObject({ code: 'INSUFFICIENT_STOCK' }),
      );
    expect(await prisma.sale.count()).toBe(0);
    expect(await prisma.saleItem.count()).toBe(0);
    expect(await prisma.stockMovement.count({ where: { type: 'SALE' } })).toBe(
      0,
    );
  });

  it('rejects invalid, duplicate and inactive products and returns 404 for missing sales', async () => {
    const { user, product, cookie } = await fixture();
    await entry(product.id, user.id, 2, '30.00');
    await request(app)
      .post('/sales')
      .set('Cookie', cookie)
      .send({
        paymentMethod: 'PIX',
        items: [{ productId: product.id, quantity: 0 }],
      })
      .expect(400);
    await request(app)
      .post('/sales')
      .set('Cookie', cookie)
      .send({
        paymentMethod: 'PIX',
        items: [
          { productId: product.id, quantity: 1 },
          { productId: product.id, quantity: 1 },
        ],
      })
      .expect(400);
    await prisma.product.update({
      where: { id: product.id },
      data: { active: false },
    });
    await request(app)
      .post('/sales')
      .set('Cookie', cookie)
      .send({
        paymentMethod: 'PIX',
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(409);
    await request(app)
      .get('/sales/does-not-exist')
      .set('Cookie', cookie)
      .expect(404);
  });
});
