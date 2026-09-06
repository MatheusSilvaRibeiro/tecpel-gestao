import { ApiError, apiRequest } from './api-client';

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

export { ApiError as AuthApiError };

export async function login(input: LoginInput) {
  const data = await apiRequest<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function getCurrentUser() {
  try {
    const data = await apiRequest<{ user: AuthUser }>('/auth/me');
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function logout() {
  await apiRequest<null>('/auth/logout', { method: 'POST' });
}
