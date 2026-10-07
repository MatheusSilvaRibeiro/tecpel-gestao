import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

export interface LogSink {
  info(entry: Record<string, unknown>): void;
  error(entry: Record<string, unknown>): void;
}

const validRequestId = /^[A-Za-z0-9._-]{1,100}$/;

export function createRequestLogger(logger: LogSink): RequestHandler {
  return (request, response, next) => {
    const receivedId = request.header('x-request-id');
    const requestId =
      receivedId && validRequestId.test(receivedId) ? receivedId : randomUUID();
    const startedAt = process.hrtime.bigint();

    response.setHeader('x-request-id', requestId);
    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      logger.info({
        event: 'http_request',
        requestId,
        method: request.method,
        path: request.path,
        status: response.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    });
    next();
  };
}

export const consoleLogSink: LogSink = {
  info: (entry) => console.info(JSON.stringify(entry)),
  error: (entry) => console.error(JSON.stringify(entry)),
};
