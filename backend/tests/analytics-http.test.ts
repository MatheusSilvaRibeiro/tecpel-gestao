import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { AnalyticsRepository } from '../src/modules/analytics/analytics-repository.js';
import { createTokenService } from '../src/modules/auth/token.js';
import type { AuthUser, UserStore } from '../src/modules/auth/user-store.js';
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
const analytics = {
  mostProfitableProducts: [
    {
      product: { id: '1', name: 'Kaiak', brand: 'Natura' },
      profit: '20.00',
      revenue: '100.00',
      quantitySold: 2,
    },
  ],
  leastProfitableProducts: [],
  profitableBrands: [],
  staleProducts: [],
  investedCapital: '50.00',
  averageMarginPercent: '20.00',
  criticalStock: [],
  outOfStock: [],
  revenueEvolution: [],
  profitEvolution: [],
};
class Repository implements AnalyticsRepository {
  getAnalytics() {
    return Promise.resolve(analytics);
  }
  getProductAnalytics() {
    return Promise.resolve({
      quantitySold: 2,
      accumulatedProfit: '20.00',
      lastSaleAt: null,
      lastPurchaseAt: null,
    });
  }
}
const tokens = createTokenService({
  secret: 'analytics-http-secret-with-32-characters',
  expiresIn: '8h',
});
const app = createApp({
  userStore: new Users(),
  analyticsRepository: new Repository(),
  tokenService: tokens,
  authCookie: { name: 'tecpel_auth', maxAgeMs: 1000 },
});
const cookie = (user: AuthUser) => `tecpel_auth=${tokens.sign(user.id)}`;
describe('analytics HTTP', () => {
  it('requires authentication and exposes complete analytics to ADMIN', async () => {
    await request(app).get('/analytics').expect(401);
    const response = await request(app)
      .get('/analytics')
      .set('Cookie', cookie(admin))
      .expect(200);
    expect(response.body.data).toMatchObject({
      investedCapital: '50.00',
      averageMarginPercent: '20.00',
    });
  });
  it('strips every sensitive financial field for VENDEDOR', async () => {
    const response = await request(app)
      .get('/analytics')
      .set('Cookie', cookie(seller))
      .expect(200);
    expect(response.body.data).not.toHaveProperty('investedCapital');
    expect(response.body.data).not.toHaveProperty('averageMarginPercent');
    expect(response.body.data).not.toHaveProperty('profitEvolution');
    expect(JSON.stringify(response.body.data)).not.toContain('"profit"');
  });
  it('returns generated insights', async () => {
    const response = await request(app)
      .get('/analytics/insights')
      .set('Cookie', cookie(admin))
      .expect(200);
    expect(response.body.data.insights).toBeInstanceOf(Array);
  });
});
