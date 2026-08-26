import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { PrismaClient, UserRole } from '@prisma/client';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ensureAdminUser } from '../../prisma/seed.js';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/modules/auth/password.js';
import { PrismaUserStore } from '../../src/modules/auth/prisma-user-store.js';
import { createTokenService } from '../../src/modules/auth/token.js';

const cookieName = 'tecpel_auth';
const tokenService = createTokenService({
  secret: 'postgres-integration-secret-with-at-least-32-characters',
  expiresIn: '8h',
});

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;
let store: PrismaUserStore;
let app: ReturnType<typeof createApp>;

async function createUser(overrides: { active?: boolean } = {}) {
  return prisma.user.create({
    data: {
      name: 'Administrador',
      username: 'admin',
      email: 'admin@tecpel.local',
      passwordHash: await hashPassword('Admin@123'),
      role: UserRole.ADMIN,
      active: overrides.active ?? true,
    },
  });
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('tecpel_auth_test')
    .withUsername('tecpel_test')
    .withPassword('tecpel_test')
    .start();

  const migrationPath = fileURLToPath(
    new URL(
      '../../prisma/migrations/20260826010000_add_user_auth/migration.sql',
      import.meta.url,
    ),
  );
  const migration = await readFile(migrationPath, 'utf8');
  const migrationResult = await container.exec([
    'psql',
    '-U',
    container.getUsername(),
    '-d',
    container.getDatabase(),
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    migration,
  ]);
  if (migrationResult.exitCode !== 0) {
    throw new Error(migrationResult.stderr);
  }

  process.env.DATABASE_URL = container.getConnectionUri();
  prisma = new PrismaClient();
  store = new PrismaUserStore(prisma);
  app = createApp({
    userStore: store,
    tokenService,
    authCookie: { name: cookieName, maxAgeMs: 8 * 60 * 60 * 1000 },
  });
});

beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma?.$disconnect();
  await container?.stop();
});

describe('autenticação com PostgreSQL e Prisma', () => {
  it('cria usuário e recupera por username e id', async () => {
    const created = await createUser();

    await expect(store.findByUsername(created.username)).resolves.toMatchObject(
      {
        id: created.id,
        username: created.username,
      },
    );
    await expect(store.findById(created.id)).resolves.toMatchObject({
      id: created.id,
      email: created.email,
    });
  });

  it('faz login com usuário persistido sem expor o hash', async () => {
    await createUser();

    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'Admin@123' });

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(response.body.data.user.username).toBe('admin');
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('retorna o usuário persistido em /auth/me', async () => {
    const user = await createUser();
    const token = tokenService.sign(user.id);

    const response = await request(app)
      .get('/auth/me')
      .set('Cookie', `${cookieName}=${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      id: user.id,
      username: user.username,
    });
  });

  it('bloqueia usuário inativo persistido', async () => {
    await createUser({ active: false });

    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'Admin@123' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('USER_INACTIVE');
  });

  it('mantém seed idempotente sem redefinir senha existente', async () => {
    const admin = {
      name: 'Administrador',
      username: 'admin',
      email: 'admin@tecpel.local',
      password: 'Admin@123',
    };

    const firstExecution = await ensureAdminUser(prisma, admin);
    expect(firstExecution.username).toBe('admin');
    expect(await prisma.user.count({ where: { username: 'admin' } })).toBe(1);

    const secondExecution = await ensureAdminUser(prisma, admin);
    expect(secondExecution.id).toBe(firstExecution.id);
    expect(await prisma.user.count({ where: { username: 'admin' } })).toBe(1);

    const changedPasswordHash = await hashPassword('SenhaAlterada@123');
    await prisma.user.update({
      where: { username: 'admin' },
      data: { passwordHash: changedPasswordHash },
    });

    await ensureAdminUser(prisma, admin);

    const persisted = await prisma.user.findUniqueOrThrow({
      where: { username: 'admin' },
    });
    expect(persisted.passwordHash).toBe(changedPasswordHash);
    expect(await prisma.user.count({ where: { username: 'admin' } })).toBe(1);
  });
});
