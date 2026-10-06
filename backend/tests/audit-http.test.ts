import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type {
  AuditFilters,
  AuditRepository,
  AuditLogView,
} from '../src/modules/audit/audit-repository.js';
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
const event: AuditLogView = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  action: 'UPDATE',
  entity: 'PRODUCT',
  entityId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  before: { salePrice: '10.00' },
  after: { salePrice: '12.00' },
  metadata: null,
  createdAt: new Date('2026-10-06T18:00:00Z'),
  user: { id: admin.id, name: admin.name },
};
class Users implements UserStore {
  findById(id: string) {
    return Promise.resolve(
      [admin, seller].find((item) => item.id === id) ?? null,
    );
  }
  findByUsername() {
    return Promise.resolve(null);
  }
}
class Repository implements AuditRepository {
  lastFilters?: AuditFilters;
  list(filters: AuditFilters) {
    this.lastFilters = filters;
    return Promise.resolve({
      data: [event],
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: 1,
        totalPages: 1,
      },
    });
  }
  findById(id: string) {
    return Promise.resolve(id === event.id ? event : null);
  }
  findByEntity() {
    return Promise.resolve([event]);
  }
}
const repository = new Repository();
const tokens = createTokenService({
  secret: 'audit-http-secret-with-at-least-32-chars',
  expiresIn: '8h',
});
const app = createApp({
  userStore: new Users(),
  auditRepository: repository,
  tokenService: tokens,
  authCookie: { name: 'tecpel_auth', maxAgeMs: 1000 },
});
const cookie = (user: AuthUser) => `tecpel_auth=${tokens.sign(user.id)}`;

describe('audit HTTP', () => {
  it('blocks unauthenticated users and VENDEDOR', async () => {
    await request(app).get('/audit').expect(401);
    await request(app).get('/audit').set('Cookie', cookie(seller)).expect(403);
  });
  it('applies filters and pagination for ADMIN', async () => {
    const response = await request(app)
      .get(
        `/audit?action=UPDATE&entity=PRODUCT&userId=${admin.id}&page=2&pageSize=10`,
      )
      .set('Cookie', cookie(admin))
      .expect(200);
    expect(repository.lastFilters).toMatchObject({
      action: 'UPDATE',
      entity: 'PRODUCT',
      userId: admin.id,
      page: 2,
      pageSize: 10,
    });
    expect(response.body.meta).toMatchObject({
      page: 2,
      pageSize: 10,
      total: 1,
    });
  });
  it('returns details and entity history and validates page size', async () => {
    expect(
      (
        await request(app)
          .get(`/audit/${event.id}`)
          .set('Cookie', cookie(admin))
      ).body.data.id,
    ).toBe(event.id);
    expect(
      (
        await request(app)
          .get(`/audit/entity/PRODUCT/${event.entityId}`)
          .set('Cookie', cookie(admin))
      ).body.data,
    ).toHaveLength(1);
    await request(app)
      .get('/audit?pageSize=101')
      .set('Cookie', cookie(admin))
      .expect(400);
  });
});
