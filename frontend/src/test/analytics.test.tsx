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
const analytics = {
  mostProfitableProducts: [
    {
      product: { id: '1', name: 'Kaiak', brand: 'Natura' },
      profit: '80.00',
      revenue: '120.00',
      quantitySold: 2,
    },
  ],
  leastProfitableProducts: [],
  profitableBrands: [],
  staleProducts: [
    {
      product: { id: '2', name: 'Produto parado' },
      currentStock: 5,
      lastUnitCost: '10.00',
      tiedCapital: '50.00',
      lastSaleAt: null,
      daysWithoutSale: null,
    },
  ],
  investedCapital: '110.00',
  averageMarginPercent: '50.00',
  criticalStock: [
    { product: { id: '2', name: 'Produto parado' }, currentStock: 5 },
  ],
  outOfStock: [],
  revenueEvolution: Array.from({ length: 30 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, '0')}`,
    value: index === 29 ? '120.00' : '0.00',
  })),
  profitEvolution: Array.from({ length: 30 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, '0')}`,
    value: index === 29 ? '80.00' : '0.00',
  })),
};
const fetchMock = vi.fn<typeof fetch>();
const success = (data: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify({ data, message: null, meta: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/analytics']}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function mock(user: typeof admin, value: unknown) {
  fetchMock.mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith('/auth/me')) return success({ user });
    if (url.endsWith('/analytics/insights'))
      return success({ insights: ['Produto parado nunca teve venda.'] });
    return success(value);
  });
}
describe('analytics frontend', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  it('renders business indicators, products, chart and insights for ADMIN', async () => {
    mock(admin, analytics);
    renderPage();
    expect(await screen.findByText('R$ 110,00')).toBeVisible();
    expect(screen.getByText('50%')).toBeVisible();
    expect(screen.getByText('Kaiak')).toBeVisible();
    expect(screen.getByText('Produto parado nunca teve venda.')).toBeVisible();
    expect(
      screen.getByLabelText('Gráfico de evolução de faturamento e lucro'),
    ).toBeVisible();
  });
  it('does not render financial cards or profit for VENDEDOR', async () => {
    const publicData = {
      ...analytics,
      investedCapital: undefined,
      averageMarginPercent: undefined,
      profitEvolution: undefined,
      mostProfitableProducts: analytics.mostProfitableProducts.map((item) => ({
        product: item.product,
        revenue: item.revenue,
        quantitySold: item.quantitySold,
      })),
      staleProducts: analytics.staleProducts.map((item) => ({
        product: item.product,
        currentStock: item.currentStock,
        lastSaleAt: item.lastSaleAt,
        daysWithoutSale: item.daysWithoutSale,
      })),
    };
    void publicData;
    mock(seller, publicData);
    renderPage();
    expect(await screen.findByText('Kaiak')).toBeVisible();
    expect(screen.queryByText('Capital investido')).not.toBeInTheDocument();
    expect(screen.queryByText('Lucro')).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 80,00')).not.toBeInTheDocument();
  });
});
