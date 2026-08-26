import { PrismaClient, UserRole } from '@prisma/client';

import { hashPassword } from '../src/modules/auth/password.js';

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME ?? 'Administrador';
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const email = process.env.ADMIN_EMAIL ?? 'admin@tecpel.local';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@123';
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { username },
    create: {
      name,
      username,
      email,
      passwordHash,
      role: UserRole.ADMIN,
      active: true,
    },
    update: {
      name,
      email,
      passwordHash,
      role: UserRole.ADMIN,
      active: true,
    },
  });

  console.info(`Usuário administrador '${username}' configurado.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
