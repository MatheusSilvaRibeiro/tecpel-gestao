import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../App';

const admin = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Admin',
  username: 'admin',
  email: 'admin@test.local',
  role: 'ADMIN',
  active: true,
};
const seller = { ...admin, role: 'VENDEDOR' };
const event = {
  id: 'audit-1',
  action: 'UPDATE',
  entity: 'PRODUCT',
  entityId: 'product-1',
  before: { salePrice: '149.90' },
  after: { salePrice: '159.90' },
  metadata: null,
  createdAt: '2026-10-06T18:32:00Z',
  user: { id: admin.id, name: 'Matheus' },
};
const fetchMock = vi.fn<typeof fetch>();
const success = (data: unknown, meta: unknown = null) =>
  Promise.resolve(
    new Response(JSON.stringify({ data, message: null, meta }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
function renderPage(path = '/audit') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function mock(user: typeof admin, fail = false) {
  fetchMock.mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith('/auth/me')) return success({ user });
    if (url.includes('/products?')) return success({ products: [] });
    if (fail)
      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: { code: 'INTERNAL_ERROR', message: 'Erro' },
          }),
          { status: 500 },
        ),
      );
    if (url.endsWith('/audit/audit-1')) return success(event);
    return success([event], {
      page: 1,
      pageSize: 20,
      total: 21,
      totalPages: 2,
    });
  });
}
describe('audit frontend', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  it('shows loading, list, readable diff and pagination for ADMIN', async () => {
    mock(admin);
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Verificando sessão');
    expect(await screen.findByText('Matheus')).toBeVisible();
    expect(screen.getByText('Preço: 149.90 → 159.90')).toBeVisible();
    expect(screen.getByText('Página 1 de 2')).toBeVisible();
    fireEvent.click(screen.getByText('Preço: 149.90 → 159.90'));
    expect(await screen.findByText('Detalhes da atividade')).toBeVisible();
    expect(await screen.findByText('Antes')).toBeVisible();
  });
  it('applies action filter and product history endpoint', async () => {
    mock(admin);
    renderPage('/audit?entity=PRODUCT&entityId=product-1');
    expect(await screen.findByText('Matheus')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/audit/entity/PRODUCT/product-1'),
      expect.anything(),
    );
  });
  it('shows API errors', async () => {
    mock(admin, true);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar',
    );
  });
  it('redirects VENDEDOR away from the audit panel', async () => {
    mock(seller);
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Produtos' }),
    ).toBeVisible();
    expect(
      screen.queryByText('Histórico de Atividades'),
    ).not.toBeInTheDocument();
  });
});
