import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  type LoginInput,
} from '../services/auth-api';

export const sessionQueryKey = ['auth', 'session'] as const;

export function useAuth() {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getCurrentUser,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => loginRequest(input),
    onSuccess: (user) => queryClient.setQueryData(sessionQueryKey, user),
  });
  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => queryClient.setQueryData(sessionQueryKey, null),
  });

  return {
    user: session.data ?? null,
    isAuthenticated: Boolean(session.data),
    isLoading: session.isLoading,
    login: loginMutation.mutateAsync,
    logout: async () => {
      try {
        await logoutMutation.mutateAsync();
      } catch {
        // A sessão local deve ser encerrada mesmo se ela já expirou no servidor.
      }
    },
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
