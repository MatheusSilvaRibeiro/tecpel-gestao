import type { PrismaClient } from '@prisma/client';

import type { UserStore } from './user-store.js';

export class PrismaUserStore implements UserStore {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }
}
