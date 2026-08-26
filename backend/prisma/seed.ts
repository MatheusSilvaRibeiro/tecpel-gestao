import { pathToFileURL } from 'node:url';

import { PrismaClient, UserRole } from '@prisma/client';

import { hashPassword } from '../src/modules/auth/password.js';

export interface AdminSeedInput {
  name: string;
  username: string;
  email: string;
  password: string;
}

export async function ensureAdminUser(
  prisma: PrismaClient,
  input: AdminSeedInput,
) {
  const existingUser = await prisma.user.findUnique({
    where: { username: input.username },
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: UserRole.ADMIN,
      active: true,
    },
  });
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const username = process.env.ADMIN_USERNAME ?? 'admin';
    await ensureAdminUser(prisma, {
      name: process.env.ADMIN_NAME ?? 'Administrador',
      username,
      email: process.env.ADMIN_EMAIL ?? 'admin@tecpel.local',
      password: process.env.ADMIN_PASSWORD ?? 'Admin@123',
    });
    console.info(`Usuário administrador '${username}' verificado.`);
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
