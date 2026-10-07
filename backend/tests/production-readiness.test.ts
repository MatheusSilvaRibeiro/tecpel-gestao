import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import type { BootstrapAdminStore } from '../src/modules/auth/bootstrap-admin.js';
import { bootstrapAdmin } from '../src/modules/auth/bootstrap-admin.js';
import { hashPassword } from '../src/modules/auth/password.js';
import type { UserStore } from '../src/modules/auth/user-store.js';
import { createTokenService } from '../src/modules/auth/token.js';

const userStore: UserStore = {
  findById: () => Promise.resolve(null),
  findByUsername: () => Promise.resolve(null),
};
const tokens = createTokenService({
  secret: 'test-secret-with-at-least-32-characters',
  expiresIn: '8h',
});

function testApp(
  overrides: Parameters<typeof createApp>[0] = {
    userStore,
    tokenService: tokens,
    authCookie: { name: 'auth', maxAgeMs: 1000 },
  },
) {
  return createApp({
    userStore,
    tokenService: tokens,
    authCookie: { name: 'auth', maxAgeMs: 1000 },
    ...overrides,
  });
}

describe('production readiness', () => {
  it('diferencia liveness de dependência indisponível', async () => {
    const application = testApp({
      userStore,
      tokenService: tokens,
      authCookie: { name: 'auth', maxAgeMs: 1000 },
      readiness: () => Promise.reject(new Error('database unavailable')),
    });
    expect((await request(application).get('/health')).status).toBe(200);
    expect((await request(application).get('/ready')).status).toBe(503);
    expect((await request(testApp()).get('/ready')).status).toBe(200);
  });

  it('restringe CORS à origem configurada', async () => {
    const application = testApp({
      userStore,
      tokenService: tokens,
      authCookie: { name: 'auth', maxAgeMs: 1000 },
      corsOrigin: 'https://allowed.example',
    });
    const allowed = await request(application)
      .get('/health')
      .set('Origin', 'https://allowed.example');
    const rejected = await request(application)
      .get('/health')
      .set('Origin', 'https://other.example');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'https://allowed.example',
    );
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('configura cookie seguro e SameSite estrito', async () => {
    const passwordHash = await hashPassword('Admin@123');
    const store: UserStore = {
      findById: () => Promise.resolve(null),
      findByUsername: () =>
        Promise.resolve({
          id: 'user-id',
          name: 'Admin',
          username: 'admin',
          email: 'a@b.com',
          passwordHash,
          role: 'ADMIN',
          active: true,
        }),
    };
    const application = createApp({
      userStore: store,
      tokenService: tokens,
      authCookie: {
        name: 'auth',
        maxAgeMs: 1000,
        secure: true,
        sameSite: 'strict',
      },
    });
    const response = await request(application)
      .post('/auth/login')
      .send({ username: 'admin', password: 'Admin@123' });
    const cookie = response.headers['set-cookie']?.[0];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
  });

  it('limita tentativas de login sem limitar globalmente', async () => {
    const application = testApp({
      userStore,
      tokenService: tokens,
      authCookie: { name: 'auth', maxAgeMs: 1000 },
      loginRateLimit: { windowMs: 60_000, max: 2 },
    });
    await request(application)
      .post('/auth/login')
      .send({ username: 'x', password: 'x' });
    await request(application)
      .post('/auth/login')
      .send({ username: 'x', password: 'x' });
    const blocked = await request(application)
      .post('/auth/login')
      .send({ username: 'x', password: 'x' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_LOGIN_ATTEMPTS');
    expect((await request(application).get('/health')).status).toBe(200);
  });

  it('gera logs sem corpo, cookies ou credenciais', async () => {
    const info = vi.fn();
    const application = testApp({
      userStore,
      tokenService: tokens,
      authCookie: { name: 'auth', maxAgeMs: 1000 },
      logger: { info, error: vi.fn() },
    });
    await request(application)
      .post('/auth/login')
      .set('Cookie', 'auth=secret')
      .send({ username: 'admin', password: 'secret-password' });
    expect(JSON.stringify(info.mock.calls)).not.toContain('secret-password');
    expect(JSON.stringify(info.mock.calls)).not.toContain('auth=secret');
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'http_request',
        method: 'POST',
        path: '/auth/login',
      }),
    );
  });

  it('cria o primeiro admin com hash e recusa quando já existe', async () => {
    const createAdmin = vi.fn();
    const store: BootstrapAdminStore = {
      countByRole: vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1),
      createAdmin,
    };
    const input = {
      name: 'Admin',
      username: 'admin',
      email: 'admin@example.com',
      password: 'strong-password',
    };
    await bootstrapAdmin(store, input);
    expect(createAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'admin',
        passwordHash: expect.stringMatching(/^\$2/),
      }),
    );
    expect(JSON.stringify(createAdmin.mock.calls)).not.toContain(
      'strong-password',
    );
    await expect(bootstrapAdmin(store, input)).rejects.toThrow(
      'bootstrap recusado',
    );
  });
});
