import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createTokenService } from '../src/modules/auth/token.js';
import type { AuthUser, UserStore } from '../src/modules/auth/user-store.js';
import type {
  CreatePurchaseInput,
  Purchase,
  PurchaseFilters,
  PurchaseStore,
} from '../src/modules/purchases/purchase-store.js';

const admin: AuthUser = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Admin',
  username: 'admin',
  email: 'admin@test.local',
  passwordHash: 'x',
  role: 'ADMIN',
  active: true,
};
const seller: AuthUser = {
  ...admin,
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  role: 'VENDEDOR',
};
class Users implements UserStore {
  findById(id: string) {
    return Promise.resolve(
      [admin, seller].find((user) => user.id === id) ?? null,
    );
  }
  findByUsername() {
    return Promise.resolve(null);
  }
}
class Purchases implements PurchaseStore {
  values: Purchase[] = [];
  lastInput?: CreatePurchaseInput;
  create(input: CreatePurchaseInput) {
    this.lastInput = input;
    const value: Purchase = {
      id: 'purchase-1',
      supplierName: input.supplierName ?? null,
      invoiceNumber: input.invoiceNumber ?? null,
      purchaseDate: input.purchaseDate,
      totalAmount: '70.00',
      createdBy: { id: input.createdById, name: 'Admin' },
      createdAt: new Date(),
      itemsCount: input.items.length,
      items: [],
    };
    this.values.push(value);
    return Promise.resolve(value);
  }
  list(filters: PurchaseFilters) {
    void filters;
    return Promise.resolve(this.values);
  }
  findById(id: string) {
    return Promise.resolve(
      this.values.find((value) => value.id === id) ?? null,
    );
  }
  getProductCost() {
    return Promise.resolve(null);
  }
}
const tokens = createTokenService({
  secret: 'purchases-test-secret-with-32-characters',
  expiresIn: '8h',
});
const store = new Purchases();
const app = createApp({
  userStore: new Users(),
  purchaseStore: store,
  tokenService: tokens,
  authCookie: { name: 'tecpel_auth', maxAgeMs: 1000 },
});
const cookie = (user: AuthUser) => `tecpel_auth=${tokens.sign(user.id)}`;
const validItem = {
  productId: '11111111-1111-4111-8111-111111111111',
  quantity: 2,
  unitCost: '35.00',
};
describe('purchases HTTP', () => {
  beforeEach(() => {
    store.values = [];
    store.lastInput = undefined;
  });
  it('creates, lists and gets a purchase for ADMIN', async () => {
    await request(app)
      .post('/purchases')
      .set('Cookie', cookie(admin))
      .send({
        purchaseDate: '2026-09-10',
        supplierName: 'Fornecedor',
        items: [validItem],
      })
      .expect(201);
    expect(store.lastInput?.createdById).toBe(admin.id);
    expect(
      (
        await request(app)
          .get('/purchases')
          .set('Cookie', cookie(admin))
          .expect(200)
      ).body.data.purchases,
    ).toHaveLength(1);
    await request(app)
      .get('/purchases/purchase-1')
      .set('Cookie', cookie(admin))
      .expect(200);
  });
  it('blocks VENDEDOR and anonymous access', async () => {
    await request(app)
      .get('/purchases')
      .set('Cookie', cookie(seller))
      .expect(403);
    await request(app).get('/purchases').expect(401);
  });
  it('rejects invalid values and duplicate products', async () => {
    await request(app)
      .post('/purchases')
      .set('Cookie', cookie(admin))
      .send({ purchaseDate: '2026-02-30', items: [validItem] })
      .expect(400);
    await request(app)
      .post('/purchases')
      .set('Cookie', cookie(admin))
      .send({
        purchaseDate: '2026-09-10',
        items: [{ ...validItem, quantity: 0 }],
      })
      .expect(400);
    const duplicate = await request(app)
      .post('/purchases')
      .set('Cookie', cookie(admin))
      .send({ purchaseDate: '2026-09-10', items: [validItem, validItem] })
      .expect(400);
    expect(duplicate.body.error.code).toBe('DUPLICATE_PRODUCT');
  });
  it('returns 404 for a missing purchase', async () => {
    await request(app)
      .get('/purchases/missing')
      .set('Cookie', cookie(admin))
      .expect(404)
      .expect(({ body }) => expect(body.error.code).toBe('PURCHASE_NOT_FOUND'));
  });
});
