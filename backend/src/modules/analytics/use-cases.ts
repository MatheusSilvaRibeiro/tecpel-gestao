import type { UserRole } from '../auth/user-store.js';
import { AnalyticsService } from './analytics-service.js';
export class GetAnalytics {
  constructor(private readonly service: AnalyticsService) {}
  execute(role: UserRole) {
    return this.service.get(role);
  }
}
export class GetInsights {
  constructor(private readonly service: AnalyticsService) {}
  execute(role: UserRole) {
    return this.service.insights(role);
  }
}
