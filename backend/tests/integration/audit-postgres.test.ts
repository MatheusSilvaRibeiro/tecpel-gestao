import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaAuditRepository } from '../../src/modules/audit/prisma-audit-repository.js';
import type { AuditWriter } from '../../src/modules/audit/audit-service.js';
import { PrismaProductStore } from '../../src/modules/products/prisma-product-store.js';
import { PrismaPurchaseStore } from '../../src/modules/purchases/prisma-purchase-store.js';
import { PrismaSaleStore } from '../../src/modules/sales/prisma-sale-store.js';
import { applyPrismaMigrations } from './helpers/apply-prisma-migrations.js';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;
let products: PrismaProductStore;
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('tecpel_audit_test')
    .withUsername('tecpel_test')
    .withPassword('tecpel_test')
    .start();
  await applyPrismaMigrations(container);
  process.env.DATABASE_URL = container.getConnectionUri();
  prisma = new PrismaClient();
  products = new PrismaProductStore(prisma);
});
beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(async () => {
  await prisma?.$disconnect();
  await container?.stop();
});
async function user(role: 'ADMIN' | 'VENDEDOR' = 'ADMIN') {
  return prisma.user.create({
    data: {
      name: role,
      username: role.toLowerCase(),
      email: `${role.toLowerCase()}@test.local`,
      passwordHash: 'x',
      role,
    },
  });
}

describe('audit trail with PostgreSQL', () => {
  it('persists product create, minimal update diff, no-op and deactivation with correct user', async () => {
    const admin = await user();
    const product = await products.create(
      { name: 'Kaiak', brand: 'Natura', type: 'PERFUME', salePrice: '149.90' },
      admin.id,
    );
    await products.update(
      product.id,
      { name: 'Kaiak Urbe', salePrice: '159.90' },
      admin.id,
    );
    await products.update(product.id, { name: 'Kaiak Urbe' }, admin.id);
    await products.deactivate(product.id, admin.id);
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'asc' },
    });
    expect(logs.map((item) => item.action)).toEqual([
      'CREATE',
      'UPDATE',
      'DEACTIVATE',
    ]);
    expect(logs[1]).toMatchObject({
      userId: admin.id,
      entity: 'PRODUCT',
      entityId: product.id,
      before: { name: 'Kaiak', salePrice: '149.90' },
      after: { name: 'Kaiak Urbe', salePrice: '159.90' },
    });
  });
  it('audits manual stock movements with previous and new stock', async () => {
    const admin = await user();
    const product = await products.create(
      { name: 'Kaiak', type: 'PERFUME', salePrice: '60.00' },
      admin.id,
    );
    await products.registerMovement({
      productId: product.id,
      type: 'ENTRY',
      quantity: 10,
      unitCost: '30.00',
      createdBy: admin.id,
    });
    await products.registerMovement({
      productId: product.id,
      type: 'ADJUSTMENT',
      quantity: -2,
      note: 'Danificado',
      createdBy: admin.id,
    });
    const logs = await prisma.auditLog.findMany({
      where: { entity: 'STOCK' },
      orderBy: { createdAt: 'asc' },
    });
    expect(logs.map((item) => item.action)).toEqual([
      'STOCK_ENTRY',
      'STOCK_ADJUSTMENT',
    ]);
    expect(logs[1].metadata).toEqual({
      quantity: -2,
      reason: 'Danificado',
      previousStock: 10,
      newStock: 8,
    });
  });
  it('audits purchases and sales once without duplicating purchase stock entries', async () => {
    const admin = await user();
    const seller = await user('VENDEDOR');
    const product = await products.create(
      { name: 'Kaiak', type: 'PERFUME', salePrice: '60.00' },
      admin.id,
    );
    await new PrismaPurchaseStore(prisma).create({
      createdById: admin.id,
      purchaseDate: new Date(),
      supplierName: 'Natura',
      items: [{ productId: product.id, quantity: 10, unitCost: '30.00' }],
    });
    await new PrismaSaleStore(prisma).create({
      soldById: seller.id,
      role: 'VENDEDOR',
      paymentMethod: 'PIX',
      items: [{ productId: product.id, quantity: 2 }],
    });
    const logs = await prisma.auditLog.findMany();
    expect(
      logs.filter((item) => item.action === 'PURCHASE_CREATED'),
    ).toHaveLength(1);
    expect(logs.filter((item) => item.action === 'SALE_CREATED')).toHaveLength(
      1,
    );
    expect(logs.filter((item) => item.action === 'STOCK_ENTRY')).toHaveLength(
      0,
    );
    expect(logs.find((item) => item.action === 'SALE_CREATED')?.userId).toBe(
      seller.id,
    );
  });
  it('rolls back the business change when mandatory audit persistence fails', async () => {
    const admin = await user();
    const failing: AuditWriter = {
      record: () => Promise.reject(new Error('audit unavailable')),
    };
    await expect(
      new PrismaProductStore(prisma, failing).create(
        { name: 'Kaiak', type: 'PERFUME', salePrice: '60.00' },
        admin.id,
      ),
    ).rejects.toThrow('audit unavailable');
    expect(await prisma.product.count()).toBe(0);
  });
  it('filters, orders and paginates persisted JSON events', async () => {
    const admin = await user();
    for (let index = 0; index < 3; index++)
      await products.create(
        { name: `Produto ${index}`, type: 'CREAM', salePrice: '10.00' },
        admin.id,
      );
    const result = await new PrismaAuditRepository(prisma).list({
      action: 'CREATE',
      entity: 'PRODUCT',
      userId: admin.id,
      page: 2,
      pageSize: 2,
    });
    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });
    expect(result.data[0].after).toMatchObject({ name: 'Produto 0' });
  });
});
