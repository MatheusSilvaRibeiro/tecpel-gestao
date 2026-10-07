import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from 'express';
import helmet from 'helmet';
import multer from 'multer';
import path from 'node:path';

import { env } from './config/env.js';
import { AppError } from './errors/app-error.js';
import { prisma } from './infrastructure/prisma/client.js';
import { PrismaUserStore } from './modules/auth/prisma-user-store.js';
import { createAuthenticate } from './modules/auth/authenticate.js';
import { createAuthRouter } from './modules/auth/routes.js';
import {
  createTokenService,
  durationToMilliseconds,
  type TokenService,
} from './modules/auth/token.js';
import type { UserStore } from './modules/auth/user-store.js';
import { PrismaDashboardStore } from './modules/dashboard/prisma-dashboard-store.js';
import { createDashboardRouter } from './modules/dashboard/routes.js';
import type { DashboardStore } from './modules/dashboard/dashboard-store.js';
import { PrismaProductStore } from './modules/products/prisma-product-store.js';
import type { ProductStore } from './modules/products/product-store.js';
import { createProductsRouter } from './modules/products/routes.js';
import { PrismaPurchaseStore } from './modules/purchases/prisma-purchase-store.js';
import { createPurchasesRouter } from './modules/purchases/routes.js';
import type { PurchaseStore } from './modules/purchases/purchase-store.js';
import { PrismaSaleStore } from './modules/sales/prisma-sale-store.js';
import { createSalesRouter } from './modules/sales/routes.js';
import type { SaleStore } from './modules/sales/sale-store.js';
import type { AnalyticsRepository } from './modules/analytics/analytics-repository.js';
import { PrismaAnalyticsRepository } from './modules/analytics/prisma-analytics-repository.js';
import { createAnalyticsRouter } from './modules/analytics/routes.js';
import type { AuditRepository } from './modules/audit/audit-repository.js';
import { PrismaAuditRepository } from './modules/audit/prisma-audit-repository.js';
import { createAuditRouter } from './modules/audit/routes.js';
import type { ReportsRepository } from './modules/reports/reports-repository.js';
import { PrismaReportsRepository } from './modules/reports/prisma-reports-repository.js';
import { createReportsRouter } from './modules/reports/routes.js';
import { createLoginRateLimit } from './http/login-rate-limit.js';
import {
  consoleLogSink,
  createRequestLogger,
  type LogSink,
} from './http/request-logger.js';

interface AppDependencies {
  userStore: UserStore;
  tokenService: TokenService;
  authCookie: {
    name: string;
    maxAgeMs: number;
    secure?: boolean;
    sameSite?: 'lax' | 'strict';
  };
  productStore?: ProductStore;
  uploadDirectory?: string;
  saleStore?: SaleStore;
  dashboardStore?: DashboardStore;
  purchaseStore?: PurchaseStore;
  analyticsRepository?: AnalyticsRepository;
  auditRepository?: AuditRepository;
  reportsRepository?: ReportsRepository;
  storeTimezone?: string;
  now?: () => Date;
  readiness?: () => Promise<void>;
  logger?: LogSink;
  corsOrigin?: string;
  jsonBodyLimit?: string;
  trustProxyHops?: number;
  appVersion?: string;
  loginRateLimit?: { windowMs: number; max: number };
}

const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({ message: 'Rota não encontrada' });
};

const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
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

  if (error instanceof multer.MulterError) {
    response.status(400).json({
      error: {
        code: 'INVALID_IMAGE',
        message: 'A imagem deve ter no máximo 5 MB.',
      },
    });
    return;
  }

  const logger = request.app.locals.logger as LogSink | undefined;
  logger?.error({
    event: 'unhandled_error',
    requestId: response.getHeader('x-request-id'),
    method: request.method,
    path: request.path,
    errorName: error instanceof Error ? error.name : 'UnknownError',
  });
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
  });
};

export function createApp(dependencies: AppDependencies) {
  const app = express();
  const allowedOrigin = dependencies.corsOrigin ?? env.CORS_ORIGIN;

  app.disable('x-powered-by');
  if ((dependencies.trustProxyHops ?? 0) > 0)
    app.set('trust proxy', dependencies.trustProxyHops);
  app.locals.logger = dependencies.logger;
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) =>
        callback(null, origin === undefined || origin === allowedOrigin),
      credentials: true,
    }),
  );
  if (dependencies.logger) app.use(createRequestLogger(dependencies.logger));
  app.use(express.json({ limit: dependencies.jsonBodyLimit ?? '100kb' }));
  app.use(cookieParser());

  if (dependencies.uploadDirectory) {
    app.use(
      '/uploads/products',
      express.static(dependencies.uploadDirectory, {
        fallthrough: false,
        index: false,
      }),
    );
  }

  app.get('/health', (_request, response) => {
    response.status(200).json({
      status: 'ok',
      version: dependencies.appVersion ?? 'development',
    });
  });
  app.get('/ready', async (_request, response) => {
    try {
      await dependencies.readiness?.();
      response.status(200).json({ status: 'ok' });
    } catch {
      response.status(503).json({ status: 'unavailable' });
    }
  });
  app.use(
    '/auth',
    createAuthRouter(
      dependencies.userStore,
      dependencies.tokenService,
      dependencies.authCookie,
      dependencies.loginRateLimit
        ? createLoginRateLimit(dependencies.loginRateLimit)
        : undefined,
    ),
  );
  const authenticate = createAuthenticate(
    dependencies.userStore,
    dependencies.tokenService,
    dependencies.authCookie.name,
  );
  if (dependencies.productStore && dependencies.uploadDirectory) {
    app.use(
      '/products',
      createProductsRouter(
        dependencies.productStore,
        authenticate,
        dependencies.uploadDirectory,
        dependencies.purchaseStore,
        dependencies.analyticsRepository,
      ),
    );
  }
  if (dependencies.saleStore)
    app.use('/sales', createSalesRouter(dependencies.saleStore, authenticate));
  if (dependencies.dashboardStore)
    app.use(
      '/dashboard',
      createDashboardRouter(
        dependencies.dashboardStore,
        authenticate,
        dependencies.storeTimezone ?? 'America/Sao_Paulo',
        dependencies.now,
      ),
    );
  if (dependencies.purchaseStore)
    app.use(
      '/purchases',
      createPurchasesRouter(dependencies.purchaseStore, authenticate),
    );
  if (dependencies.analyticsRepository)
    app.use(
      '/analytics',
      createAnalyticsRouter(
        dependencies.analyticsRepository,
        authenticate,
        dependencies.storeTimezone ?? 'America/Sao_Paulo',
        dependencies.now,
      ),
    );
  if (dependencies.auditRepository)
    app.use(
      '/audit',
      createAuditRouter(dependencies.auditRepository, authenticate),
    );
  if (dependencies.reportsRepository)
    app.use(
      '/reports',
      createReportsRouter(
        dependencies.reportsRepository,
        authenticate,
        dependencies.storeTimezone ?? 'America/Sao_Paulo',
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
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
  productStore: new PrismaProductStore(prisma),
  saleStore: new PrismaSaleStore(prisma),
  dashboardStore: new PrismaDashboardStore(prisma),
  purchaseStore: new PrismaPurchaseStore(prisma),
  analyticsRepository: new PrismaAnalyticsRepository(prisma),
  auditRepository: new PrismaAuditRepository(prisma),
  reportsRepository: new PrismaReportsRepository(prisma),
  storeTimezone: env.STORE_TIMEZONE,
  uploadDirectory: path.resolve(env.UPLOAD_DIR),
  readiness: async () => {
    await prisma.$queryRaw`SELECT 1`;
  },
  logger: env.NODE_ENV === 'test' ? undefined : consoleLogSink,
  corsOrigin: env.CORS_ORIGIN,
  jsonBodyLimit: env.JSON_BODY_LIMIT,
  trustProxyHops: env.TRUST_PROXY_HOPS,
  appVersion: env.APP_VERSION,
  loginRateLimit: {
    windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
    max: env.LOGIN_RATE_LIMIT_MAX,
  },
});
