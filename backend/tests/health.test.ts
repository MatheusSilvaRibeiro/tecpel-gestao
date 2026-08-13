import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app.js';

describe('API', () => {
  it('responde ao healthcheck', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'tecpel-backend' });
  });

  it('responde 404 para uma rota desconhecida', async () => {
    const response = await request(app).get('/rota-inexistente');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Rota não encontrada' });
  });
});
