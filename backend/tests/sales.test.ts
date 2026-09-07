import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import type { AuthUser, UserStore } from '../src/modules/auth/user-store.js';
import { createTokenService } from '../src/modules/auth/token.js';
import type {
  CreateSaleInput,
  Sale,
  SaleFilters,
  SaleStore,
} from '../src/modules/sales/sale-store.js';

const admin: AuthUser = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Administrador',
  username: 'admin',
  email: 'admin@test.local',
  passwordHash: 'unused',
  role: 'ADMIN',
  active: true,
};
const seller: AuthUser = {
  ...admin,
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Vendedor',
  role: 'VENDEDOR',
};
class Users implements UserStore {
  findById(id: string) {
    return Promise.resolve(
      [admin, seller].find((user) => user.id === id) ?? null,
    );
  }
  findByUsername(username: string) {
    return Promise.resolve(
      [admin, seller].find((user) => user.username === username) ?? null,
    );
  }
}
class Sales implements SaleStore {
  values: Sale[] = [];
  lastInput?: CreateSaleInput;
  create(input: CreateSaleInput) {
    this.lastInput = input;
    const sale: Sale = {
      id: 'sale-1',
      soldBy: { id: input.soldById, name: 'Usuário' },
      paymentMethod: input.paymentMethod,
      totalAmount: '60.00',
      totalCost: '30.00',
      totalProfit: '30.00',
      createdAt: new Date('2026-09-06T12:00:00Z'),
      items: [],
    };
    this.values.push(sale);
    return Promise.resolve(sale);
  }
  list(filters: SaleFilters) {
    void filters;
    return Promise.resolve(this.values);
  }
  findById(id: string) {
    return Promise.resolve(this.values.find((sale) => sale.id === id) ?? null);
  }
}
const tokens = createTokenService({
  secret: 'sales-test-secret-with-at-least-32-chars',
  expiresIn: '8h',
});
const store = new Sales();
const app = createApp({
  userStore: new Users(),
  saleStore: store,
  tokenService: tokens,
  authCookie: { name: 'tecpel_auth', maxAgeMs: 1000 },
});
const cookie = (user: AuthUser) => `tecpel_auth=${tokens.sign(user.id)}`;

describe('sales HTTP', () => {
  beforeEach(() => {
    store.values = [];
    store.lastInput = undefined;
  });
  it('allows ADMIN and preserves an optional custom price', async () => {
    await request(app)
      .post('/sales')
      .set('Cookie', cookie(admin))
      .send({
        paymentMethod: 'PIX',
        items: [
          {
            productId: '11111111-1111-4111-8111-111111111111',
            quantity: 1,
            unitPrice: '55.00',
          },
        ],
      })
      .expect(201);
    expect(store.lastInput).toMatchObject({
      role: 'ADMIN',
      items: [{ unitPrice: '55.00' }],
    });
  });
  it('allows VENDEDOR and forwards its role so persistence ignores price', async () => {
    await request(app)
      .post('/sales')
      .set('Cookie', cookie(seller))
      .send({
        paymentMethod: 'CASH',
        items: [
          {
            productId: '11111111-1111-4111-8111-111111111111',
            quantity: 1,
            unitPrice: '1.00',
          },
        ],
      })
      .expect(201);
    expect(store.lastInput?.role).toBe('VENDEDOR');
  });
  it('validates quantity, payment, duplicates and authentication', async () => {
    const item = {
      productId: '11111111-1111-4111-8111-111111111111',
      quantity: 0,
    };
    await request(app)
      .post('/sales')
      .set('Cookie', cookie(admin))
      .send({ paymentMethod: 'PIX', items: [item] })
      .expect(400);
    await request(app)
      .post('/sales')
      .set('Cookie', cookie(admin))
      .send({ paymentMethod: 'INVALID', items: [{ ...item, quantity: 1 }] })
      .expect(400);
    await request(app)
      .post('/sales')
      .set('Cookie', cookie(admin))
      .send({
        paymentMethod: 'PIX',
        items: [
          { ...item, quantity: 1 },
          { ...item, quantity: 1 },
        ],
      })
      .expect(400);
    await request(app).get('/sales').expect(401);
  });
  it('lists and returns sale details and 404', async () => {
    await request(app)
      .post('/sales')
      .set('Cookie', cookie(admin))
      .send({
        paymentMethod: 'PIX',
        items: [
          { productId: '11111111-1111-4111-8111-111111111111', quantity: 1 },
        ],
      });
    const list = await request(app)
      .get('/sales?paymentMethod=PIX')
      .set('Cookie', cookie(seller))
      .expect(200);
    expect(list.body.data.sales).toHaveLength(1);
    await request(app)
      .get('/sales/sale-1')
      .set('Cookie', cookie(admin))
      .expect(200);
    await request(app)
      .get('/sales/missing')
      .set('Cookie', cookie(admin))
      .expect(404)
      .expect(({ body }) => expect(body.error.code).toBe('SALE_NOT_FOUND'));
  });
});
