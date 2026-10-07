import { describe, expect, it, vi } from 'vitest';

import { createGracefulShutdown } from '../src/server.js';

describe('graceful shutdown', () => {
  it('para o servidor, desconecta o banco e ignora sinais repetidos', async () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn((callback: (error?: Error) => void) => callback());
    const shutdown = createGracefulShutdown({
      server: { close },
      disconnect,
    });

    shutdown('SIGTERM');
    shutdown('SIGINT');
    await vi.waitFor(() => expect(disconnect).toHaveBeenCalledOnce());
    expect(close).toHaveBeenCalledOnce();
  });
});
