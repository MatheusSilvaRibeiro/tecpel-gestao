import { Router, type RequestHandler } from 'express';
import { authorize } from '../auth/authorize.js';
import type { DashboardStore } from './dashboard-store.js';
import { GetDashboard } from './use-case.js';

export function createDashboardRouter(
  store: DashboardStore,
  authenticate: RequestHandler,
  timezone: string,
  now?: () => Date,
) {
  const router = Router();
  const getDashboard = new GetDashboard(store, timezone, now);
  router.get(
    '/',
    authenticate,
    authorize('ADMIN', 'VENDEDOR'),
    async (request, response, next) => {
      try {
        response.json({
          data: await getDashboard.execute(request.authUser.role),
          message: null,
          meta: null,
        });
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
