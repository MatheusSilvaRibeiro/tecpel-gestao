export interface SuccessResponse<T> {
  data: T;
  message: string | null;
  meta: unknown;
}

interface ErrorResponse {
  error?: { code?: string; message?: string };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  });
  const body = (await response.json()) as SuccessResponse<T> & ErrorResponse;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error?.code ?? 'UNKNOWN_ERROR',
      body.error?.message ?? 'Não foi possível concluir a solicitação.',
    );
  }
  return body.data;
}
