import { describe, expect, it } from 'vitest';

import { env } from '../src/config/env.js';

describe('configuração do ambiente', () => {
  it('aplica valores padrão válidos', () => {
    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(3333);
  });
});
