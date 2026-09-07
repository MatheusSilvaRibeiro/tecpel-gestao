import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/)
    .default('8h'),
  AUTH_COOKIE_NAME: z.string().min(1).default('tecpel_auth'),
  CORS_ORIGIN: z.url().default('http://localhost:5173'),
  STORE_TIMEZONE: z.string().min(1).default('America/Sao_Paulo'),
});

export function parseEnv(input: NodeJS.ProcessEnv) {
  return envSchema.parse(input);
}

export const env = parseEnv(process.env);
