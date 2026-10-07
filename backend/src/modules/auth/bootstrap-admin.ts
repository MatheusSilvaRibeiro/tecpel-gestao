import { hashPassword } from './password.js';
import type { UserRole } from './user-store.js';

export interface BootstrapAdminInput {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface BootstrapAdminStore {
  countByRole(role: UserRole): Promise<number>;
  createAdmin(
    input: Omit<BootstrapAdminInput, 'password'> & { passwordHash: string },
  ): Promise<void>;
}

export async function bootstrapAdmin(
  store: BootstrapAdminStore,
  input: BootstrapAdminInput,
) {
  if ((await store.countByRole('ADMIN')) > 0) {
    throw new Error('Já existe um usuário ADMIN; bootstrap recusado.');
  }
  await store.createAdmin({
    name: input.name,
    username: input.username,
    email: input.email,
    passwordHash: await hashPassword(input.password),
  });
}
