import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

import {
  bootstrapAdmin,
  type BootstrapAdminStore,
} from '../modules/auth/bootstrap-admin.js';

const inputSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  email: z.email(),
  password: z.string().min(12),
});

async function main() {
  const input = inputSchema.parse({
    name: process.env.BOOTSTRAP_ADMIN_NAME,
    username: process.env.BOOTSTRAP_ADMIN_USERNAME,
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });
  const prisma = new PrismaClient();
  const store: BootstrapAdminStore = {
    countByRole: (role) => prisma.user.count({ where: { role } }),
    createAdmin: async (admin) => {
      await prisma.user.create({
        data: { ...admin, role: 'ADMIN', active: true },
      });
    },
  };

  try {
    await bootstrapAdmin(store, input);
    console.info(`Administrador '${input.username}' criado com sucesso.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Bootstrap falhou.');
  process.exitCode = 1;
});
