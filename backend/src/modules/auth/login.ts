import { AppError } from '../../errors/app-error.js';
import { verifyPassword } from './password.js';
import type { TokenService } from './token.js';
import { toPublicUser, type UserStore } from './user-store.js';

interface LoginInput {
  username: string;
  password: string;
}

export function createLogin(userStore: UserStore, tokenService: TokenService) {
  return async ({ username, password }: LoginInput) => {
    const user = await userStore.findByUsername(username);
    const passwordMatches = user
      ? await verifyPassword(password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Usuário ou senha inválidos.',
      );
    }
    if (!user.active) {
      throw new AppError(403, 'USER_INACTIVE', 'Usuário inativo.');
    }

    return {
      user: toPublicUser(user),
      token: tokenService.sign(user.id),
    };
  };
}
