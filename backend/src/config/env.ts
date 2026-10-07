import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
    JWT_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhd]$/)
      .default('8h'),
    AUTH_COOKIE_NAME: z.string().min(1).default('tecpel_auth'),
    CORS_ORIGIN: z.url().default('http://localhost:5173'),
    STORE_TIMEZONE: z.string().min(1).default('America/Sao_Paulo'),
    UPLOAD_DIR: z.string().min(1).default('uploads/products'),
    APP_VERSION: z.string().min(1).default('development'),
    JSON_BODY_LIMIT: z
      .string()
      .regex(/^\d+(kb|mb)$/i)
      .default('100kb'),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
    LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && value.CORS_ORIGIN.includes('*')) {
      context.addIssue({
        code: 'custom',
        path: ['CORS_ORIGIN'],
        message: 'CORS_ORIGIN não pode conter wildcard em produção',
      });
    }
  });

export function parseEnv(input: NodeJS.ProcessEnv) {
  return envSchema.parse(input);
}

export const env = parseEnv(process.env);
