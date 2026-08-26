export type UserRole = 'ADMIN' | 'VENDEDOR';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface LoginInput {
  username: string;
  password: string;
}

interface SuccessResponse<T> {
  data: T;
  message: string | null;
  meta: unknown;
}

interface ErrorResponse {
  error?: { code?: string; message?: string };
}

export class AuthApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const body = (await response.json()) as SuccessResponse<T> & ErrorResponse;

  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      body.error?.code ?? 'UNKNOWN_ERROR',
      body.error?.message ?? 'Não foi possível concluir a solicitação.',
    );
  }

  return body.data;
}

export async function login(input: LoginInput) {
  const data = await request<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function getCurrentUser() {
  try {
    const data = await request<{ user: AuthUser }>('/auth/me');
    return data.user;
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) return null;
    throw error;
  }
}

export async function logout() {
  await request<null>('/auth/logout', { method: 'POST' });
}
