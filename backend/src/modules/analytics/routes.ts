import { Router, type RequestHandler } from 'express';
import { authorize } from '../auth/authorize.js';
import type { AnalyticsRepository } from './analytics-repository.js';
import { AnalyticsService } from './analytics-service.js';
import { GetAnalytics, GetInsights } from './use-cases.js';
export function createAnalyticsRouter(
  repository: AnalyticsRepository,
  authenticate: RequestHandler,
  timezone: string,
  now?: () => Date,
) {
  const router = Router();
  const service = new AnalyticsService(repository, timezone, now);
  const analytics = new GetAnalytics(service);
  const insights = new GetInsights(service);
  router.use(authenticate, authorize('ADMIN', 'VENDEDOR'));
  router.get('/', async (request, response, next) => {
    try {
      response.json({
        data: await analytics.execute(request.authUser.role),
        message: null,
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  });
  router.get('/insights', async (request, response, next) => {
    try {
      response.json({
        data: { insights: await insights.execute(request.authUser.role) },
        message: null,
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
