import { describe, expect, it } from 'vitest';

import {
  InvalidAuthTokenError,
  createTokenService,
} from '../src/modules/auth/token.js';

const secret = 'unit-test-secret-with-at-least-32-characters';

describe('JWT', () => {
  it('gera e valida um token contendo somente o subject necessário', () => {
    const tokens = createTokenService({ secret, expiresIn: '8h' });

    const token = tokens.sign('user-id');
    const payload = tokens.verify(token);

    expect(payload).toEqual({ userId: 'user-id' });
    expect(token.split('.')).toHaveLength(3);
  });

  it('rejeita token inválido', () => {
    const tokens = createTokenService({ secret, expiresIn: '8h' });

    expect(() => tokens.verify('invalid-token')).toThrow(InvalidAuthTokenError);
  });

  it('rejeita token expirado', async () => {
    const tokens = createTokenService({ secret, expiresIn: '0s' });
    const token = tokens.sign('user-id');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(() => tokens.verify(token)).toThrow(InvalidAuthTokenError);
  });
});
