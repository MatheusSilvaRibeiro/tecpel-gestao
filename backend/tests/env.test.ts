import { describe, expect, it } from 'vitest';

import { env, parseEnv } from '../src/config/env.js';

describe('configuração do ambiente', () => {
  it('aplica valores padrão válidos', () => {
    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(3333);
    expect(env.JWT_EXPIRES_IN).toBe('8h');
    expect(env.AUTH_COOKIE_NAME).toBe('tecpel_auth');
  });

  it('rejeita JWT_SECRET ausente', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow();
  });

  it('rejeita JWT_SECRET curto', () => {
    expect(() =>
      parseEnv({ NODE_ENV: 'production', JWT_SECRET: 'curto' }),
    ).toThrow();
  });
});
