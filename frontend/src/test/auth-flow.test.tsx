import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoutes } from '../App';

const admin = {
  id: 'f4308827-9f0a-4a8e-b8ca-19cc41cb6842',
  name: 'Administrador',
  username: 'admin',
  email: 'admin@tecpel.local',
  role: 'ADMIN',
  active: true,
};

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function mockUnauthenticatedSession() {
  fetchMock.mockImplementationOnce(() =>
    jsonResponse(
      {
        error: { code: 'UNAUTHENTICATED', message: 'Autenticação necessária.' },
      },
      401,
    ),
  );
}

function mockAuthenticatedSession() {
  fetchMock.mockImplementationOnce(() =>
    jsonResponse({ data: { user: admin }, message: null, meta: null }),
  );
}

function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillLoginForm() {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Usuário'), 'admin');
  await user.type(screen.getByLabelText('Senha'), 'Admin@123');
  return user;
}

describe('autenticação no frontend', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('renderiza o formulário de login acessível', async () => {
    mockUnauthenticatedSession();
    renderRoute('/login');

    expect(
      await screen.findByRole('heading', { name: 'Acesse sua conta' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Usuário')).toBeVisible();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('valida os campos obrigatórios', async () => {
    mockUnauthenticatedSession();
    const user = userEvent.setup();
    renderRoute('/login');

    await screen.findByLabelText('Usuário');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe o usuário.')).toBeVisible();
    expect(screen.getByText('Informe a senha.')).toBeVisible();
  });

  it('envia username e senha com credenciais incluídas', async () => {
    mockUnauthenticatedSession();
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ data: { user: admin }, message: null, meta: null }),
    );
    const user = await fillLoginFormAfterRender();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ username: 'admin', password: 'Admin@123' }),
      }),
    );
  });

  it('desabilita o botão durante o login', async () => {
    mockUnauthenticatedSession();
    let resolveLogin: ((response: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveLogin = resolve;
        }),
    );
    const user = await fillLoginFormAfterRender();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByRole('button', { name: 'Entrando...' }),
    ).toBeDisabled();
    resolveLogin?.(
      new Response(JSON.stringify({ data: { user: admin } }), { status: 200 }),
    );
  });

  it('mostra erro de credenciais inválidas', async () => {
    mockUnauthenticatedSession();
    fetchMock.mockImplementationOnce(() =>
      jsonResponse(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Usuário ou senha inválidos.',
          },
        },
        401,
      ),
    );
    const user = await fillLoginFormAfterRender();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Usuário ou senha inválidos.',
    );
  });

  it('mostra mensagem apropriada para usuário inativo', async () => {
    mockUnauthenticatedSession();
    fetchMock.mockImplementationOnce(() =>
      jsonResponse(
        { error: { code: 'USER_INACTIVE', message: 'Usuário inativo.' } },
        403,
      ),
    );
    const user = await fillLoginFormAfterRender();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este usuário está inativo. Fale com o administrador.',
    );
  });

  it('mostra mensagem genérica quando a API está indisponível', async () => {
    mockUnauthenticatedSession();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const user = await fillLoginFormAfterRender();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao sistema. Tente novamente.',
    );
  });

  it('redireciona para o dashboard após login válido', async () => {
    mockUnauthenticatedSession();
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ data: { user: admin }, message: null, meta: null }),
    );
    const user = await fillLoginFormAfterRender();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Bem-vindo, Administrador.')).toBeVisible();
  });

  it('restaura a sessão válida por /auth/me', async () => {
    mockAuthenticatedSession();
    renderRoute('/dashboard');

    expect(await screen.findByText('Bem-vindo, Administrador.')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('mostra loading sem redirecionar enquanto verifica a sessão', () => {
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>(() => undefined),
    );
    renderRoute('/dashboard');

    expect(screen.getByText('Verificando sessão...')).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Acesse sua conta' }),
    ).not.toBeInTheDocument();
  });

  it('impede usuário não autenticado de acessar o dashboard', async () => {
    mockUnauthenticatedSession();
    renderRoute('/dashboard');

    expect(
      await screen.findByRole('heading', { name: 'Acesse sua conta' }),
    ).toBeVisible();
  });

  it('redireciona usuário autenticado para fora do login', async () => {
    mockAuthenticatedSession();
    renderRoute('/login');

    expect(await screen.findByText('Bem-vindo, Administrador.')).toBeVisible();
  });

  it('faz logout, limpa a sessão e retorna ao login', async () => {
    mockAuthenticatedSession();
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        data: null,
        message: 'Logout realizado com sucesso.',
        meta: null,
      }),
    );
    const user = userEvent.setup();
    renderRoute('/dashboard');

    await user.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(
      await screen.findByRole('heading', { name: 'Acesse sua conta' }),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('retorna ao login mesmo se a sessão expirar antes do logout', async () => {
    mockAuthenticatedSession();
    fetchMock.mockImplementationOnce(() =>
      jsonResponse(
        {
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Autenticação necessária.',
          },
        },
        401,
      ),
    );
    const user = userEvent.setup();
    renderRoute('/dashboard');

    await user.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(
      await screen.findByRole('heading', { name: 'Acesse sua conta' }),
    ).toBeVisible();
  });
});

async function fillLoginFormAfterRender() {
  renderRoute('/login');
  return fillLoginForm();
}
