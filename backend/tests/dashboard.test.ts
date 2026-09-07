import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { AuthUser, UserStore } from '../src/modules/auth/user-store.js';
import { createTokenService } from '../src/modules/auth/token.js';
import type {
  DashboardData,
  DashboardStore,
} from '../src/modules/dashboard/dashboard-store.js';

const admin: AuthUser = {
  id: 'admin',
  name: 'Administrador',
  username: 'admin',
  email: 'admin@test.local',
  passwordHash: 'unused',
  role: 'ADMIN',
  active: true,
};
const seller: AuthUser = {
  ...admin,
  id: 'seller',
  name: 'Vendedor',
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
const data: DashboardData = {
  today: {
    revenue: '950.00',
    cost: '530.00',
    profit: '420.00',
    salesCount: 6,
    averageTicket: '158.33',
  },
  stock: { activeProducts: 9, outOfStock: 3, lowStock: 5 },
  recentSales: [
    {
      id: 'sale-1',
      createdAt: new Date('2026-09-06T12:00:00Z'),
      soldBy: { id: seller.id, name: seller.name },
      units: 4,
      totalAmount: '200.00',
      paymentMethod: 'PIX',
      totalProfit: '80.00',
    },
  ],
  revenueLast7Days: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-09-0${index + 1}`,
    revenue: index === 0 ? '0.00' : '100.00',
  })),
};
class Dashboard implements DashboardStore {
  readNow?: Date;
  timezone?: string;
  read(now: Date, timezone: string) {
    this.readNow = now;
    this.timezone = timezone;
    return Promise.resolve(data);
  }
}
const tokens = createTokenService({
  secret: 'dashboard-test-secret-with-at-least-32-chars',
  expiresIn: '8h',
});
const store = new Dashboard();
const app = createApp({
  userStore: new Users(),
  dashboardStore: store,
  tokenService: tokens,
  authCookie: { name: 'tecpel_auth', maxAgeMs: 1000 },
  storeTimezone: 'America/Sao_Paulo',
  now: () => new Date('2026-09-06T15:00:00Z'),
});
const cookie = (user: AuthUser) => `tecpel_auth=${tokens.sign(user.id)}`;

describe('dashboard HTTP', () => {
  it('returns every operational and financial indicator to ADMIN', async () => {
    const response = await request(app)
      .get('/dashboard')
      .set('Cookie', cookie(admin))
      .expect(200);
    expect(response.body.data).toMatchObject({
      ...data,
      recentSales: data.recentSales.map((sale) => ({
        ...sale,
        createdAt: sale.createdAt.toISOString(),
      })),
    });
    expect(response.body.data.revenueLast7Days).toHaveLength(7);
    expect(store.timezone).toBe('America/Sao_Paulo');
    expect(store.readNow?.toISOString()).toBe('2026-09-06T15:00:00.000Z');
  });
  it('removes cost and profit at every level for VENDEDOR', async () => {
    const response = await request(app)
      .get('/dashboard')
      .set('Cookie', cookie(seller))
      .expect(200);
    expect(response.body.data.today).toEqual({
      revenue: '950.00',
      salesCount: 6,
      averageTicket: '158.33',
    });
    expect(response.body.data.today).not.toHaveProperty('cost');
    expect(response.body.data.today).not.toHaveProperty('profit');
    expect(response.body.data.recentSales[0]).not.toHaveProperty('totalProfit');
    expect(JSON.stringify(response.body)).not.toContain('530.00');
    expect(JSON.stringify(response.body)).not.toContain('420.00');
  });
  it('requires authentication', () =>
    request(app).get('/dashboard').expect(401));
});
