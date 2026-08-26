import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import type { AuthUser, UserStore } from '../src/modules/auth/user-store.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { createTokenService } from '../src/modules/auth/token.js';

const tokenSecret = 'integration-secret-with-at-least-32-characters';
const cookieName = 'tecpel_auth';

class MemoryUserStore implements UserStore {
  users: AuthUser[] = [];

  findById(id: string) {
    return Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }

  findByUsername(username: string) {
    return Promise.resolve(
      this.users.find((user) => user.username === username) ?? null,
    );
  }
}

function publicUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    active: user.active,
  };
}

function getCookie(response: request.Response) {
  const header = response.headers['set-cookie'];
  return Array.isArray(header) ? header[0] : header;
}

describe('auth HTTP', () => {
  const store = new MemoryUserStore();
  const tokens = createTokenService({ secret: tokenSecret, expiresIn: '8h' });
  const app = createApp({
    userStore: store,
    tokenService: tokens,
    authCookie: { name: cookieName, maxAgeMs: 8 * 60 * 60 * 1000 },
  });
  let admin: AuthUser;

  beforeEach(async () => {
    admin = {
      id: 'f4308827-9f0a-4a8e-b8ca-19cc41cb6842',
      name: 'Administrador',
      username: 'admin',
      email: 'admin@tecpel.local',
      passwordHash: await hashPassword('Admin@123'),
      role: 'ADMIN',
      active: true,
    };
    store.users = [admin];
  });

  describe('POST /auth/login', () => {
    it('autentica credenciais válidas e cria cookie HttpOnly', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'Admin@123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: { user: publicUser(admin) },
        message: null,
        meta: null,
      });
      expect(getCookie(response)).toContain(`${cookieName}=`);
      expect(getCookie(response)).toContain('HttpOnly');
      expect(getCookie(response)).toContain('SameSite=Lax');
      expect(getCookie(response)).toContain('Path=/');
      expect(getCookie(response)).toContain('Max-Age=28800');
      expect(response.body).not.toHaveProperty('data.user.passwordHash');
      expect(response.body).not.toHaveProperty('data.token');
    });

    it.each([
      { username: 'admin', password: 'incorreta' },
      { username: 'inexistente', password: 'Admin@123' },
    ])('não revela qual credencial está incorreta', async (credentials) => {
      const response = await request(app).post('/auth/login').send(credentials);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Usuário ou senha inválidos.',
        },
      });
    });

    it('rejeita payload inválido', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: '', password: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('bloqueia usuário inativo', async () => {
      admin.active = false;

      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'Admin@123' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('USER_INACTIVE');
    });
  });

  describe('GET /auth/me', () => {
    it('retorna o usuário autenticado', async () => {
      const token = tokens.sign(admin.id);

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', `${cookieName}=${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: { user: publicUser(admin) },
        message: null,
        meta: null,
      });
      expect(response.body).not.toHaveProperty('data.user.passwordHash');
    });

    it.each([
      ['sem cookie', undefined],
      ['com token inválido', `${cookieName}=invalid-token`],
    ])('responde 401 %s', async (_scenario, cookie) => {
      const call = request(app).get('/auth/me');
      if (cookie) call.set('Cookie', cookie);

      const response = await call;

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejeita token expirado', async () => {
      const expiredTokens = createTokenService({
        secret: tokenSecret,
        expiresIn: '0s',
      });
      const expiredApp = createApp({
        userStore: store,
        tokenService: expiredTokens,
        authCookie: { name: cookieName, maxAgeMs: 0 },
      });
      const token = expiredTokens.sign(admin.id);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await request(expiredApp)
        .get('/auth/me')
        .set('Cookie', `${cookieName}=${token}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejeita usuário removido após emissão do token', async () => {
      const token = tokens.sign(admin.id);
      store.users = [];

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', `${cookieName}=${token}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('bloqueia usuário inativo', async () => {
      const token = tokens.sign(admin.id);
      admin.active = false;

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', `${cookieName}=${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('USER_INACTIVE');
    });
  });

  describe('POST /auth/logout', () => {
    it('remove o cookie de autenticação', async () => {
      const response = await request(app).post('/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: null,
        message: 'Logout realizado com sucesso.',
        meta: null,
      });
      expect(getCookie(response)).toContain(`${cookieName}=;`);
      expect(getCookie(response)).toContain('Expires=Thu, 01 Jan 1970');
      expect(getCookie(response)).toContain('HttpOnly');
    });
  });
});
