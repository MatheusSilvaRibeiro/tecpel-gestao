import type { RequestHandler } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  now?: () => number;
}

interface ClientWindow {
  count: number;
  resetAt: number;
}

export function createLoginRateLimit(
  options: RateLimitOptions,
): RequestHandler {
  const clients = new Map<string, ClientWindow>();
  const now = options.now ?? Date.now;

  return (request, response, next) => {
    const currentTime = now();
    const key = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const current = clients.get(key);
    const window =
      !current || current.resetAt <= currentTime
        ? { count: 0, resetAt: currentTime + options.windowMs }
        : current;

    window.count += 1;
    clients.set(key, window);
    response.setHeader('RateLimit-Limit', String(options.max));
    response.setHeader(
      'RateLimit-Reset',
      String(Math.ceil(window.resetAt / 1000)),
    );

    if (window.count > options.max) {
      response.setHeader(
        'Retry-After',
        String(Math.ceil((window.resetAt - currentTime) / 1000)),
      );
      response.status(429).json({
        error: {
          code: 'TOO_MANY_LOGIN_ATTEMPTS',
          message: 'Muitas tentativas de login. Tente novamente mais tarde.',
        },
      });
      return;
    }

    next();
  };
}
