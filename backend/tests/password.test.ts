import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../src/modules/auth/password.js';

describe('password', () => {
  it('gera hash sem armazenar a senha em texto puro', async () => {
    const password = 'Admin@123';

    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('aceita a senha correta', async () => {
    const hash = await hashPassword('Admin@123');

    await expect(verifyPassword('Admin@123', hash)).resolves.toBe(true);
  });

  it('rejeita uma senha incorreta', async () => {
    const hash = await hashPassword('Admin@123');

    await expect(verifyPassword('incorreta', hash)).resolves.toBe(false);
  });
});
