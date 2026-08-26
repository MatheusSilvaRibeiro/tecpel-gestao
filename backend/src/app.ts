import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { AppError } from './errors/app-error.js';
import { prisma } from './infrastructure/prisma/client.js';
import { PrismaUserStore } from './modules/auth/prisma-user-store.js';
import { createAuthRouter } from './modules/auth/routes.js';
import {
  createTokenService,
  durationToMilliseconds,
  type TokenService,
} from './modules/auth/token.js';
import type { UserStore } from './modules/auth/user-store.js';

interface AppDependencies {
  userStore: UserStore;
  tokenService: TokenService;
  authCookie: { name: string; maxAgeMs: number; secure?: boolean };
}

const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({ message: 'Rota não encontrada' });
};

const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  void _next;

  if (error instanceof AppError) {
    response.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (env.NODE_ENV !== 'production') console.error(error);
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
  });
};

export function createApp(dependencies: AppDependencies) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok', service: 'tecpel-backend' });
  });
  app.use(
    '/auth',
    createAuthRouter(
      dependencies.userStore,
      dependencies.tokenService,
      dependencies.authCookie,
    ),
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp({
  userStore: new PrismaUserStore(prisma),
  tokenService: createTokenService({
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  }),
  authCookie: {
    name: env.AUTH_COOKIE_NAME,
    maxAgeMs: durationToMilliseconds(env.JWT_EXPIRES_IN),
    secure: env.NODE_ENV === 'production',
  },
});
