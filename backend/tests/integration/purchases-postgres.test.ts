import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPurchaseStore } from '../../src/modules/purchases/prisma-purchase-store.js';
import { applyPrismaMigrations } from './helpers/apply-prisma-migrations.js';
import { resetIntegrationDatabase } from './helpers/reset-integration-database.js';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;
let store: PrismaPurchaseStore;
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('tecpel_purchases_test')
    .withUsername('tecpel_test')
    .withPassword('tecpel_test')
    .start();
  await applyPrismaMigrations(container);
  process.env.DATABASE_URL = container.getConnectionUri();
  prisma = new PrismaClient();
  store = new PrismaPurchaseStore(prisma);
});
beforeEach(async () => {
  await resetIntegrationDatabase(prisma);
});
afterAll(async () => {
  await prisma?.$disconnect();
  await container?.stop();
});
async function fixture() {
  const user = await prisma.user.create({
    data: {
      name: 'Admin',
      username: 'admin',
      email: 'admin@test.local',
      passwordHash: 'x',
      role: 'ADMIN',
    },
  });
  const first = await prisma.product.create({
    data: { name: 'Kaiak', type: 'PERFUME', salePrice: '60.00' },
  });
  const second = await prisma.product.create({
    data: { name: 'Tododia', type: 'CREAM', salePrice: '25.00' },
  });
  return { user, first, second };
}
describe('purchases with PostgreSQL', () => {
  it('creates items and linked ENTRY movements atomically with exact totals', async () => {
    const { user, first, second } = await fixture();
    const purchase = await store.create({
      createdById: user.id,
      purchaseDate: new Date('2026-09-10T12:00:00Z'),
      supplierName: 'Fornecedor',
      items: [
        { productId: first.id, quantity: 2, unitCost: '30.00' },
        { productId: second.id, quantity: 3, unitCost: '10.00' },
      ],
    });
    expect(purchase).toMatchObject({ totalAmount: '90.00', itemsCount: 2 });
    const movements = await prisma.stockMovement.findMany();
    expect(movements).toHaveLength(2);
    expect(
      movements.every(
        (movement) => movement.type === 'ENTRY' && movement.purchaseItemId,
      ),
    ).toBe(true);
  });
  it('rolls back the entire purchase when a product is invalid', async () => {
    const { user, first } = await fixture();
    await expect(
      store.create({
        createdById: user.id,
        purchaseDate: new Date(),
        items: [
          { productId: first.id, quantity: 1, unitCost: '30.00' },
          {
            productId: '11111111-1111-4111-8111-111111111111',
            quantity: 1,
            unitCost: '10.00',
          },
        ],
      }),
    ).rejects.toMatchObject({ code: 'PRODUCT_NOT_FOUND' });
    expect(await prisma.purchase.count()).toBe(0);
    expect(await prisma.stockMovement.count()).toBe(0);
  });
  it('uses purchase date then creation date for latest cost and margin', async () => {
    const { user, first } = await fixture();
    await store.create({
      createdById: user.id,
      purchaseDate: new Date('2026-09-08T12:00:00Z'),
      items: [{ productId: first.id, quantity: 1, unitCost: '20.00' }],
    });
    await store.create({
      createdById: user.id,
      purchaseDate: new Date('2026-09-10T12:00:00Z'),
      items: [{ productId: first.id, quantity: 1, unitCost: '35.00' }],
    });
    expect(await store.getProductCost(first.id)).toMatchObject({
      lastUnitCost: '35.00',
      grossMarginValue: '25.00',
      grossMarginPercent: '41.67',
    });
  });
});
