import type { AuthUser } from '../modules/auth/user-store.js';

declare global {
  namespace Express {
    interface Request {
      authUser: AuthUser;
    }
  }
}

export {};
