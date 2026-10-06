import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const migrationsDirectory = fileURLToPath(
  new URL('../../../prisma/migrations/', import.meta.url),
);

export async function applyPrismaMigrations(
  container: StartedPostgreSqlContainer,
) {
  const migrations = await listPrismaMigrations();

  for (const migration of migrations) {
    const sql = await readFile(migration.path, 'utf8');
    const result = await container.exec([
      'psql',
      '-U',
      container.getUsername(),
      '-d',
      container.getDatabase(),
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sql,
    ]);
    if (result.exitCode !== 0) {
      throw new Error(`Migration ${migration.name} failed: ${result.stderr}`);
    }
  }
}

export async function listPrismaMigrations() {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => ({
      name,
      path: path.join(migrationsDirectory, name, 'migration.sql'),
    }));
}
