import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppRoutes } from '../App';

const admin = {
  id: 'admin',
  name: 'Administrador',
  username: 'admin',
  email: 'admin@tecpel.local',
  role: 'ADMIN',
  active: true,
};
const seller = { ...admin, id: 'seller', name: 'Vendedor', role: 'VENDEDOR' };
const product = {
  id: 'p1',
  name: 'Kaiak',
  brand: 'Natura',
  description: 'Fragrância fresca',
  type: 'PERFUME',
  salePrice: '149.90',
  imageUrl: null,
  active: true,
  currentStock: 8,
  createdAt: '2026-09-06T12:00:00.000Z',
  updatedAt: '2026-09-06T12:00:00.000Z',
};
const fetchMock = vi.fn<typeof fetch>();
const json = (data: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
const success = (data: unknown) => json({ data, message: null, meta: null });

function renderRoute(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockApi(user = admin) {
  fetchMock.mockImplementation((input, init) => {
    const url = String(input);
    if (url.endsWith('/auth/me')) return success({ user });
    if (url.includes('/products/p1/stock/entries') && init?.method === 'POST')
      return success({});
    if (
      url.includes('/products/p1/stock/adjustments') &&
      init?.method === 'POST'
    )
      return success({});
    if (url.endsWith('/products/p1/stock'))
      return success({ currentStock: 8, movements: [] });
    if (url.endsWith('/products/p1')) return success({ product });
    if (url.includes('/products?')) return success({ products: [product] });
    if (url.endsWith('/products') && init?.method === 'POST')
      return success({ product });
    return success(null);
  });
}

describe('products frontend', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('shows loading and then renders product list', async () => {
    let resolveProducts: ((value: Response) => void) | undefined;
    fetchMock.mockImplementation((input) =>
      String(input).endsWith('/auth/me')
        ? success({ user: admin })
        : new Promise<Response>((resolve) => {
            resolveProducts = resolve;
          }),
    );
    renderRoute('/products');
    expect(await screen.findByText('Carregando produtos...')).toBeVisible();
    resolveProducts?.(
      new Response(JSON.stringify({ data: { products: [product] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(await screen.findByText('Kaiak')).toBeVisible();
    expect(screen.getByText('8 un.')).toBeVisible();
  });

  it('shows list error state', async () => {
    fetchMock.mockImplementation((input) =>
      String(input).endsWith('/auth/me')
        ? success({ user: admin })
        : json({ error: { code: 'INTERNAL_ERROR', message: 'Erro' } }, 500),
    );
    renderRoute('/products');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar',
    );
  });

  it('shows write action for ADMIN and hides it from VENDEDOR', async () => {
    mockApi(admin);
    const view = renderRoute('/products');
    expect(
      await screen.findByRole('link', { name: /Novo produto/ }),
    ).toBeVisible();
    view.unmount();
    mockApi(seller);
    renderRoute('/products');
    await screen.findByText('Kaiak');
    expect(
      screen.queryByRole('link', { name: /Novo produto/ }),
    ).not.toBeInTheDocument();
  });

  it('redirects VENDEDOR away from the product creation route', async () => {
    mockApi(seller);
    renderRoute('/products/new');
    expect(
      await screen.findByRole('heading', { name: 'Produtos' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Novo produto' }),
    ).not.toBeInTheDocument();
  });

  it('validates and submits product registration as multipart form data', async () => {
    mockApi(admin);
    const user = userEvent.setup();
    renderRoute('/products/new');
    await screen.findByRole('heading', { name: 'Novo produto' });
    await user.click(screen.getByRole('button', { name: 'Salvar produto' }));
    expect(await screen.findByText('Informe o nome.')).toBeVisible();
    await user.type(screen.getByLabelText('Nome'), 'Kaiak');
    await user.type(screen.getByLabelText('Preço de venda'), '149.90');
    await user.click(screen.getByRole('button', { name: 'Salvar produto' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/products$/),
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
      ),
    );
  });

  it('shows product details and stock actions only for ADMIN', async () => {
    mockApi(admin);
    const view = renderRoute('/products/p1');
    expect(await screen.findByRole('heading', { name: 'Kaiak' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Registrar entrada' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Registrar ajuste' }),
    ).toBeVisible();
    view.unmount();
    mockApi(seller);
    renderRoute('/products/p1');
    await screen.findByRole('heading', { name: 'Kaiak' });
    expect(
      screen.queryByRole('button', { name: 'Registrar entrada' }),
    ).not.toBeInTheDocument();
  });

  it('registers entry and adjustment and refreshes stock', async () => {
    mockApi(admin);
    const user = userEvent.setup();
    renderRoute('/products/p1');
    await screen.findByRole('heading', { name: 'Kaiak' });
    const quantity = screen.getByLabelText('Quantidade');
    await user.clear(quantity);
    await user.type(quantity, '10');
    await user.type(screen.getByLabelText('Custo unitário'), '32.50');
    await user.click(screen.getByRole('button', { name: 'Registrar entrada' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/stock/entries'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const delta = screen.getByLabelText('Quantidade com sinal');
    await user.clear(delta);
    await user.type(delta, '-2');
    await user.type(screen.getByLabelText('Motivo'), 'Produto danificado');
    await user.click(screen.getByRole('button', { name: 'Registrar ajuste' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/stock/adjustments'),
        expect.objectContaining({
          body: JSON.stringify({ quantity: -2, note: 'Produto danificado' }),
        }),
      ),
    );
  });
});
