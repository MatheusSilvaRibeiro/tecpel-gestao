import type { Server } from 'node:http';
import { pathToFileURL } from 'node:url';

import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './infrastructure/prisma/client.js';

export interface ShutdownDependencies {
  server: Pick<Server, 'close'>;
  disconnect: () => Promise<void>;
  logger?: Pick<Console, 'info' | 'error'>;
}

export function createGracefulShutdown(dependencies: ShutdownDependencies) {
  let shuttingDown = false;
  return (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    dependencies.logger?.info(`Encerramento iniciado (${signal}).`);
    dependencies.server.close((serverError) => {
      void dependencies
        .disconnect()
        .then(() => {
          if (serverError) throw serverError;
          dependencies.logger?.info('Encerramento concluído.');
        })
        .catch((error: unknown) => {
          dependencies.logger?.error('Falha durante o encerramento.', error);
          process.exitCode = 1;
        });
    });
  };
}

export function startServer() {
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.info(
      JSON.stringify({
        event: 'application_started',
        port: env.PORT,
        version: env.APP_VERSION,
      }),
    );
  });
  const shutdown = createGracefulShutdown({
    server,
    disconnect: () => prisma.$disconnect(),
    logger: console,
  });
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  return server;
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) startServer();
