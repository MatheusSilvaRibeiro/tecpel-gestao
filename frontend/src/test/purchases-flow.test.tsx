import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../App';

const admin = {
  id: 'admin',
  name: 'Admin',
  username: 'admin',
  email: 'admin@test.local',
  role: 'ADMIN',
  active: true,
};
const seller = { ...admin, role: 'VENDEDOR' };
const success = (data: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify({ data, message: null, meta: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
const fetchMock = vi.fn<typeof fetch>();
function renderRoute(path: string) {
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
describe('purchases frontend', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  it('lists purchases with business fields for ADMIN', async () => {
    fetchMock.mockImplementation((input) =>
      String(input).endsWith('/auth/me')
        ? success({ user: admin })
        : success({
            purchases: [
              {
                id: 'purchase-1',
                supplierName: 'Natura',
                invoiceNumber: 'NF-10',
                purchaseDate: '2026-09-10T12:00:00Z',
                totalAmount: '90.00',
                createdBy: { id: 'admin', name: 'Admin' },
                createdAt: '2026-09-10T13:00:00Z',
                itemsCount: 2,
              },
            ],
          }),
    );
    renderRoute('/purchases');
    expect(await screen.findByText('Natura')).toBeVisible();
    expect(screen.getByText('R$ 90,00')).toBeVisible();
    expect(screen.getByText('NF-10')).toBeVisible();
  });
  it('does not expose the purchases page to VENDEDOR', async () => {
    fetchMock.mockImplementation((input) =>
      String(input).endsWith('/auth/me')
        ? success({ user: seller })
        : success({ products: [] }),
    );
    renderRoute('/purchases');
    expect(
      await screen.findByRole('heading', { name: 'Produtos' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Compras' }),
    ).not.toBeInTheDocument();
  });
});
