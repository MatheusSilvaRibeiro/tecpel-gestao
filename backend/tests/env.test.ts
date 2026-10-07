import { describe, expect, it } from 'vitest';

import { env, parseEnv } from '../src/config/env.js';

describe('configuração do ambiente', () => {
  it('aplica valores padrão válidos', () => {
    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(3333);
    expect(env.JWT_EXPIRES_IN).toBe('8h');
    expect(env.AUTH_COOKIE_NAME).toBe('tecpel_auth');
    expect(env.STORE_TIMEZONE).toBe('America/Sao_Paulo');
    expect(env.UPLOAD_DIR).toBe('uploads/products');
    expect(env.JSON_BODY_LIMIT).toBe('100kb');
    expect(env.TRUST_PROXY_HOPS).toBe(0);
  });

  it('rejeita JWT_SECRET ausente', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow();
  });

  it('rejeita JWT_SECRET curto', () => {
    expect(() =>
      parseEnv({ NODE_ENV: 'production', JWT_SECRET: 'curto' }),
    ).toThrow();
  });

  it('rejeita origem CORS com wildcard em produção', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'production-secret-with-at-least-32-characters',
        CORS_ORIGIN: 'https://*.example.com',
      }),
    ).toThrow();
  });
});
