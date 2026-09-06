import type { RequestHandler } from 'express';

import { AppError } from '../../errors/app-error.js';
import type { UserRole } from './user-store.js';

export function authorize(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.authUser) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Autenticação necessária.'));
      return;
    }
    if (!roles.includes(request.authUser.role)) {
      next(
        new AppError(
          403,
          'FORBIDDEN',
          'Você não tem permissão para esta ação.',
        ),
      );
      return;
    }
    next();
  };
}
