import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../App';
const admin = {
  id: 'a',
  name: 'Admin',
  username: 'admin',
  email: 'admin@test.local',
  role: 'ADMIN',
  active: true,
};
const success = (data: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify({ data, message: null, meta: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
const fetchMock = vi.fn<typeof fetch>();
function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/reports']}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function mock(role: 'ADMIN' | 'VENDEDOR') {
  fetchMock.mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith('/auth/me')) return success({ user: { ...admin, role } });
    if (url.includes('payment-methods'))
      return success([
        { paymentMethod: 'PIX', salesCount: 1, totalAmount: '100.00' },
      ]);
    return success({
      summary: {
        salesCount: 1,
        revenue: '100.00',
        averageTicket: '100.00',
        ...(role === 'ADMIN' ? { cost: '30.00', profit: '70.00' } : {}),
      },
      records: {
        data: [
          {
            id: 's',
            createdAt: '2026-10-01T13:00:00Z',
            seller: { id: 'a', name: 'Admin' },
            paymentMethod: 'PIX',
            itemsCount: 1,
            totalAmount: '100.00',
            ...(role === 'ADMIN'
              ? { totalCost: '30.00', totalProfit: '70.00' }
              : {}),
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });
  });
}
describe('reports frontend', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  it('shows summaries, records and export for ADMIN', async () => {
    mock('ADMIN');
    renderPage();
    expect((await screen.findAllByText(/100,00/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lucro').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: 'Compras' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Exportar CSV/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/reports/sales/export'),
    );
  });
  it('does not expose purchases or financial cards to VENDEDOR', async () => {
    mock('VENDEDOR');
    renderPage();
    expect(await screen.findByText('Admin')).toBeVisible();
    expect(
      screen.queryByRole('tab', { name: 'Compras' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Lucro')).not.toBeInTheDocument();
  });
});
