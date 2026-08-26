import { zodResolver } from '@hookform/resolvers/zod';
import { LockKeyhole, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useAuth } from '../hooks/useAuth';
import { AuthApiError } from '../services/auth-api';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário.'),
  password: z.string().min(1, 'Informe a senha.'),
});

type LoginForm = z.infer<typeof loginSchema>;

function getLoginError(error: unknown) {
  if (error instanceof AuthApiError) {
    if (error.code === 'INVALID_CREDENTIALS')
      return 'Usuário ou senha inválidos.';
    if (error.code === 'USER_INACTIVE')
      return 'Este usuário está inativo. Fale com o administrador.';
  }
  return 'Não foi possível conectar ao sistema. Tente novamente.';
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useAuth();
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(input: LoginForm) {
    setRequestError(null);
    try {
      await login(input);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setRequestError(getLoginError(error));
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-stone-950 px-5 py-8 text-stone-100 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(251,191,36,0.12),transparent_32%),radial-gradient(circle_at_85%_75%,rgba(120,113,108,0.15),transparent_30%)]" />
      <section className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-stone-900/90 shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden flex-col justify-between border-r border-white/10 p-12 lg:flex">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-300 font-black text-stone-950">
              TP
            </span>
            <div>
              <p className="font-semibold">TecPel Gestão</p>
              <p className="text-sm text-stone-400">Perfumes e cremes</p>
            </div>
          </div>
          <div className="max-w-lg">
            <div className="mb-6 grid size-14 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
              <Sparkles aria-hidden="true" size={24} />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">
              Gestão simples
            </p>
            <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight">
              Tudo o que importa, em um só lugar.
            </h1>
            <p className="mt-5 max-w-md leading-7 text-stone-300">
              Acompanhe sua operação com segurança, clareza e informações
              confiáveis.
            </p>
          </div>
          <p className="text-sm text-stone-500">
            Acesso seguro à operação TecPel.
          </p>
        </div>

        <div className="flex items-center p-6 sm:p-10 lg:p-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <span className="grid size-11 place-items-center rounded-2xl bg-amber-300 font-black text-stone-950">
                TP
              </span>
              <p className="mt-4 font-semibold">TecPel Gestão</p>
            </div>
            <div className="mb-8">
              <div className="mb-5 grid size-11 place-items-center rounded-xl bg-white/5 text-stone-300">
                <LockKeyhole aria-hidden="true" size={20} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">
                Acesse sua conta
              </h2>
              <p className="mt-2 text-stone-400">
                Informe suas credenciais para continuar.
              </p>
            </div>

            <form
              className="space-y-5"
              noValidate
              onSubmit={handleSubmit(onSubmit)}
            >
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-stone-200"
                  htmlFor="username"
                >
                  Usuário
                </label>
                <input
                  aria-describedby={
                    errors.username ? 'username-error' : undefined
                  }
                  aria-invalid={Boolean(errors.username)}
                  aria-required="true"
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/10 bg-stone-950/70 px-4 py-3 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
                  id="username"
                  placeholder="Digite seu usuário"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="mt-2 text-sm text-red-300" id="username-error">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="mb-2 block text-sm font-medium text-stone-200"
                  htmlFor="password"
                >
                  Senha
                </label>
                <input
                  aria-describedby={
                    errors.password ? 'password-error' : undefined
                  }
                  aria-invalid={Boolean(errors.password)}
                  aria-required="true"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-stone-950/70 px-4 py-3 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300/70 focus:ring-4 focus:ring-amber-300/10"
                  id="password"
                  placeholder="Digite sua senha"
                  type="password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-2 text-sm text-red-300" id="password-error">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {requestError && (
                <p
                  aria-live="polite"
                  className="rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-200"
                  role="alert"
                >
                  {requestError}
                </p>
              )}

              <button
                className="mt-2 w-full rounded-xl bg-amber-300 px-4 py-3 font-bold text-stone-950 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoggingIn}
                type="submit"
              >
                {isLoggingIn ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
