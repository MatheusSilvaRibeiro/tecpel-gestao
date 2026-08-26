import jwt, { type SignOptions } from 'jsonwebtoken';

export class InvalidAuthTokenError extends Error {}

export interface TokenService {
  sign(userId: string): string;
  verify(token: string): { userId: string };
}

interface TokenConfig {
  secret: string;
  expiresIn: string;
}

export function createTokenService(config: TokenConfig): TokenService {
  return {
    sign(userId) {
      return jwt.sign({}, config.secret, {
        subject: userId,
        expiresIn: config.expiresIn as SignOptions['expiresIn'],
      });
    },
    verify(token) {
      try {
        const payload = jwt.verify(token, config.secret);
        if (typeof payload === 'string' || !payload.sub) {
          throw new InvalidAuthTokenError();
        }
        return { userId: payload.sub };
      } catch {
        throw new InvalidAuthTokenError();
      }
    },
  };
}

export function durationToMilliseconds(duration: string) {
  const value = Number.parseInt(duration.slice(0, -1), 10);
  const unit = duration.at(-1);
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * (multipliers[unit ?? ''] ?? 0);
}
