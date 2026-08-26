import { Router, type CookieOptions } from 'express';
import { z } from 'zod';

import { AppError } from '../../errors/app-error.js';
import { createAuthenticate } from './authenticate.js';
import { createLogin } from './login.js';
import type { TokenService } from './token.js';
import { toPublicUser, type UserStore } from './user-store.js';

export interface AuthCookieConfig {
  name: string;
  maxAgeMs: number;
  secure?: boolean;
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export function createAuthRouter(
  userStore: UserStore,
  tokenService: TokenService,
  authCookie: AuthCookieConfig,
) {
  const router = Router();
  const login = createLogin(userStore, tokenService);
  const authenticate = createAuthenticate(
    userStore,
    tokenService,
    authCookie.name,
  );
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: authCookie.secure ?? false,
    sameSite: 'lax',
    path: '/',
    maxAge: authCookie.maxAgeMs,
  };

  router.post('/login', async (request, response, next) => {
    try {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Payload inválido.');
      }

      const result = await login(parsed.data);
      response.cookie(authCookie.name, result.token, cookieOptions);
      response.status(200).json({
        data: { user: result.user },
        message: null,
        meta: null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', authenticate, (request, response) => {
    response.status(200).json({
      data: { user: toPublicUser(request.authUser) },
      message: null,
      meta: null,
    });
  });

  router.post('/logout', (_request, response) => {
    response.clearCookie(authCookie.name, cookieOptions);
    response.status(200).json({
      data: null,
      message: 'Logout realizado com sucesso.',
      meta: null,
    });
  });

  return router;
}
