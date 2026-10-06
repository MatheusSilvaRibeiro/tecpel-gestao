import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { describe, expect, it, vi } from 'vitest';
import {
  applyPrismaMigrations,
  listPrismaMigrations,
} from './integration/helpers/apply-prisma-migrations.js';

describe('integration database migrations', () => {
  it('discovers every Prisma migration in chronological order', async () => {
    const migrations = await listPrismaMigrations();
    const names = migrations.map(({ name }) => name);
    expect(names).toContain('20261006010000_add_audit_trail');
    expect(names).toEqual([...names].sort());
    expect(migrations.every(({ path }) => path.endsWith('migration.sql'))).toBe(
      true,
    );
  });

  it('applies every discovered migration, including AuditLog', async () => {
    const exec = vi.fn().mockResolvedValue({ exitCode: 0, stderr: '' });
    const container = {
      exec,
      getUsername: () => 'test',
      getDatabase: () => 'test',
    } as unknown as StartedPostgreSqlContainer;

    await applyPrismaMigrations(container);

    const migrations = await listPrismaMigrations();
    expect(exec).toHaveBeenCalledTimes(migrations.length);
    expect(exec.mock.calls.map((call) => String(call[0].at(-1))).join('\n')).toContain(
      'CREATE TABLE "AuditLog"',
    );
  });
});
