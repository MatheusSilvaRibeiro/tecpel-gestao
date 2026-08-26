import type { RequestHandler } from 'express';

import { AppError } from '../../errors/app-error.js';
import { InvalidAuthTokenError, type TokenService } from './token.js';
import type { UserStore } from './user-store.js';

export function createAuthenticate(
  userStore: UserStore,
  tokenService: TokenService,
  cookieName: string,
): RequestHandler {
  return async (request, _response, next) => {
    try {
      const token = request.cookies?.[cookieName] as unknown;
      if (typeof token !== 'string') {
        throw new AppError(401, 'UNAUTHENTICATED', 'Autenticação necessária.');
      }

      let userId: string;
      try {
        userId = tokenService.verify(token).userId;
      } catch (error) {
        if (error instanceof InvalidAuthTokenError) {
          throw new AppError(
            401,
            'UNAUTHENTICATED',
            'Autenticação necessária.',
          );
        }
        throw error;
      }

      const user = await userStore.findById(userId);
      if (!user) {
        throw new AppError(401, 'UNAUTHENTICATED', 'Autenticação necessária.');
      }
      if (!user.active) {
        throw new AppError(403, 'USER_INACTIVE', 'Usuário inativo.');
      }

      request.authUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
