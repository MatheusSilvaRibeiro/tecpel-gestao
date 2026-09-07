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
  email: 'admin@test.local',
  role: 'ADMIN',
  active: true,
};
const seller = { ...admin, id: 'seller', name: 'Vendedor', role: 'VENDEDOR' };
const product = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Kaiak',
  brand: 'Natura',
  description: null,
  type: 'PERFUME',
  salePrice: '60.00',
  imageUrl: null,
  active: true,
  currentStock: 2,
  createdAt: '2026-09-06T12:00:00.000Z',
  updatedAt: '2026-09-06T12:00:00.000Z',
};
const sale = {
  id: 'sale-1',
  soldBy: { id: 'admin', name: 'Administrador' },
  paymentMethod: 'PIX',
  totalAmount: '120.00',
  totalCost: '70.00',
  totalProfit: '50.00',
  createdAt: '2026-09-06T12:00:00.000Z',
  items: [
    {
      id: 'item-1',
      product: { id: product.id, name: product.name },
      quantity: 2,
      unitPrice: '60.00',
      unitCost: '35.00',
      subtotal: '120.00',
      profit: '50.00',
    },
  ],
};
const fetchMock = vi.fn<typeof fetch>();
const success = (data: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify({ data, message: null, meta: null }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
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
    if (url.includes('/products?')) return success({ products: [product] });
    if (url.endsWith('/sales') && init?.method === 'POST')
      return success({ sale }, 201);
    if (url.endsWith('/sales/sale-1')) return success({ sale });
    if (url.includes('/sales?')) return success({ sales: [sale] });
    return success(null);
  });
}

describe('sales frontend', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  it('shows loading, sales and API errors', async () => {
    let resolveSales: ((value: Response) => void) | undefined;
    fetchMock.mockImplementation((input) =>
      String(input).endsWith('/auth/me')
        ? success({ user: admin })
        : new Promise<Response>((resolve) => {
            resolveSales = resolve;
          }),
    );
    renderRoute('/sales');
    expect(await screen.findByText('Carregando vendas...')).toBeVisible();
    resolveSales?.(await success({ sales: [sale] }));
    expect(await screen.findByText('R$ 120,00')).toBeVisible();
  });
  it('shows an error when sales cannot be loaded', async () => {
    fetchMock.mockImplementation((input) =>
      String(input).endsWith('/auth/me')
        ? success({ user: admin })
        : Promise.resolve(
            new Response(
              JSON.stringify({ error: { code: 'INTERNAL_ERROR' } }),
              { status: 500, headers: { 'Content-Type': 'application/json' } },
            ),
          ),
    );
    renderRoute('/sales');
    expect(
      await screen.findByText('Não foi possível carregar as vendas.'),
    ).toBeVisible();
  });
  it('blocks an item whose quantity exceeds available stock', async () => {
    mockApi();
    const user = userEvent.setup();
    renderRoute('/sales/new');
    await screen.findByRole('option', { name: /Kaiak/ });
    await user.selectOptions(
      await screen.findByLabelText('Produto'),
      product.id,
    );
    await user.clear(screen.getByLabelText('Quantidade'));
    await user.type(screen.getByLabelText('Quantidade'), '3');
    await user.click(screen.getByRole('button', { name: /adicionar/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Estoque insuficiente. Disponível: 2 unidades.',
    );
    expect(screen.getByText('Adicione produtos ao carrinho.')).toBeVisible();
  });
  it('calculates subtotal and total and creates a sale', async () => {
    mockApi();
    const user = userEvent.setup();
    renderRoute('/sales/new');
    await screen.findByRole('option', { name: /Kaiak/ });
    await user.selectOptions(
      await screen.findByLabelText('Produto'),
      product.id,
    );
    await user.clear(screen.getByLabelText('Quantidade'));
    await user.type(screen.getByLabelText('Quantidade'), '2');
    await user.click(screen.getByRole('button', { name: /adicionar/i }));
    expect(screen.getAllByText('R$ 120,00')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Finalizar venda' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/sales'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"quantity":2'),
        }),
      ),
    );
    expect(
      await screen.findByText('Venda registrada com sucesso.'),
    ).toBeVisible();
  });
  it('lets ADMIN edit price and sends it', async () => {
    mockApi();
    const user = userEvent.setup();
    renderRoute('/sales/new');
    await screen.findByRole('option', { name: /Kaiak/ });
    await user.selectOptions(
      await screen.findByLabelText('Produto'),
      product.id,
    );
    await user.click(screen.getByRole('button', { name: /adicionar/i }));
    const price = screen.getByLabelText('Preço de Kaiak');
    await user.clear(price);
    await user.type(price, '55.00');
    expect(screen.getAllByText('R$ 55,00')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Finalizar venda' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/sales'),
        expect.objectContaining({
          body: expect.stringContaining('"unitPrice":"55.00"'),
        }),
      ),
    );
  });
  it('does not let VENDEDOR edit or send a price', async () => {
    mockApi(seller);
    const user = userEvent.setup();
    renderRoute('/sales/new');
    await screen.findByRole('option', { name: /Kaiak/ });
    await user.selectOptions(
      await screen.findByLabelText('Produto'),
      product.id,
    );
    await user.click(screen.getByRole('button', { name: /adicionar/i }));
    expect(screen.queryByLabelText('Preço de Kaiak')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Finalizar venda' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).endsWith('/sales') && init?.method === 'POST',
      );
      expect(String(call?.[1]?.body)).not.toContain('unitPrice');
    });
  });
  it('renders sale details with frozen cost and profit', async () => {
    mockApi();
    renderRoute('/sales/sale-1');
    expect(await screen.findByText('Detalhes da venda')).toBeVisible();
    expect(screen.getByText('R$ 35,00')).toBeVisible();
    expect(screen.getAllByText('R$ 50,00')).toHaveLength(2);
  });
});
