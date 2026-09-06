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

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;
let uploadDirectory: string;
const cookieName = 'tecpel_auth';
const tokens = createTokenService({
  secret: 'stock-integration-secret-with-at-least-32-chars',
  expiresIn: '8h',
});

async function applyMigration(relativePath: string) {
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
    .withDatabase('tecpel_products_test')
    .withUsername('tecpel_test')
    .withPassword('tecpel_test')
    .start();
  await applyMigration(
    '../../prisma/migrations/20260826010000_add_user_auth/migration.sql',
  );
  await applyMigration(
    '../../prisma/migrations/20260906010000_add_products_stock/migration.sql',
  );
  process.env.DATABASE_URL = container.getConnectionUri();
  prisma = new PrismaClient();
  uploadDirectory = await mkdtemp(
    path.join(tmpdir(), 'tecpel-products-integration-'),
  );
  app = createApp({
    userStore: new PrismaUserStore(prisma),
    productStore: new PrismaProductStore(prisma),
    tokenService: tokens,
    authCookie: { name: cookieName, maxAgeMs: 1000 },
    uploadDirectory,
  });
});

beforeEach(async () => {
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma?.$disconnect();
  await container?.stop();
  if (uploadDirectory)
    await rm(uploadDirectory, { recursive: true, force: true });
});

async function createUser(role: UserRole) {
  return prisma.user.create({
    data: {
      name: role === UserRole.ADMIN ? 'Administrador' : 'Vendedor',
      username: role.toLowerCase(),
      email: `${role.toLowerCase()}@tecpel.local`,
      passwordHash: 'unused',
      role,
    },
  });
}

describe('products and stock with PostgreSQL', () => {
  it('applies migration and persists Product with decimal price and image URL', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Kaiak',
        brand: 'Natura',
        type: 'PERFUME',
        salePrice: '149.90',
        imageUrl: '/uploads/products/image.jpg',
      },
    });
    expect(product.salePrice.toFixed(2)).toBe('149.90');
    expect(product.imageUrl).toBe('/uploads/products/image.jpg');
  });

  it('persists StockMovement relations and returns the real sum ordered newest first', async () => {
    const user = await createUser(UserRole.ADMIN);
    const product = await prisma.product.create({
      data: { name: 'Creme', type: 'CREAM', salePrice: '29.90' },
    });
    const store = new PrismaProductStore(prisma);
    await store.registerMovement({
      productId: product.id,
      type: 'ENTRY',
      quantity: 10,
      unitCost: '12.50',
      createdBy: user.id,
    });
    await store.registerMovement({
      productId: product.id,
      type: 'ADJUSTMENT',
      quantity: -2,
      note: 'Dano',
      createdBy: user.id,
    });
    const stock = await store.getStock(product.id);
    expect(stock?.currentStock).toBe(8);
    expect(stock?.movements).toHaveLength(2);
    expect(stock?.movements[0]?.createdBy).toEqual({
      id: user.id,
      name: user.name,
    });
  });

  it('does not persist an adjustment that would create negative stock', async () => {
    const user = await createUser(UserRole.ADMIN);
    const product = await prisma.product.create({
      data: { name: 'Kaiak', type: 'PERFUME', salePrice: '100' },
    });
    const store = new PrismaProductStore(prisma);
    await expect(
      store.registerMovement({
        productId: product.id,
        type: 'ADJUSTMENT',
        quantity: -1,
        note: 'Perda',
        createdBy: user.id,
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
    await expect(prisma.stockMovement.count()).resolves.toBe(0);
  });

  it('filters products and preserves them after soft delete', async () => {
    const store = new PrismaProductStore(prisma);
    const perfume = await store.create({
      name: 'Kaiak',
      type: 'PERFUME',
      salePrice: '149.90',
    });
    await store.create({
      name: 'Creme mãos',
      type: 'CREAM',
      salePrice: '29.90',
    });
    await store.deactivate(perfume.id);
    await expect(
      store.list({ search: 'kai', type: 'PERFUME', active: false }),
    ).resolves.toHaveLength(1);
    await expect(prisma.product.count()).resolves.toBe(2);
  });

  it('enforces ADMIN and VENDEDOR authorization on persisted endpoints', async () => {
    const admin = await createUser(UserRole.ADMIN);
    const seller = await createUser(UserRole.VENDEDOR);
    const adminCookie = `${cookieName}=${tokens.sign(admin.id)}`;
    const sellerCookie = `${cookieName}=${tokens.sign(seller.id)}`;
    const created = await request(app)
      .post('/products')
      .set('Cookie', adminCookie)
      .field('name', 'Kaiak')
      .field('type', 'PERFUME')
      .field('salePrice', '149.90');
    expect(created.status).toBe(201);
    await request(app).get('/products').set('Cookie', sellerCookie).expect(200);
    await request(app)
      .delete(`/products/${created.body.data.product.id}`)
      .set('Cookie', sellerCookie)
      .expect(403);
  });
});
