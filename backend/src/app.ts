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

interface AppDependencies {
  userStore: UserStore;
  tokenService: TokenService;
  authCookie: { name: string; maxAgeMs: number; secure?: boolean };
  productStore?: ProductStore;
  uploadDirectory?: string;
  saleStore?: SaleStore;
  dashboardStore?: DashboardStore;
  purchaseStore?: PurchaseStore;
  storeTimezone?: string;
  now?: () => Date;
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

  if (error instanceof multer.MulterError) {
    response.status(400).json({
      error: {
        code: 'INVALID_IMAGE',
        message: 'A imagem deve ter no máximo 5 MB.',
      },
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
  productStore: new PrismaProductStore(prisma),
  saleStore: new PrismaSaleStore(prisma),
  dashboardStore: new PrismaDashboardStore(prisma),
  purchaseStore: new PrismaPurchaseStore(prisma),
  storeTimezone: env.STORE_TIMEZONE,
  uploadDirectory: path.resolve('uploads/products'),
});
