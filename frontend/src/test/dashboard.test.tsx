import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
const dashboard = {
  today: {
    revenue: '950.00',
    cost: '530.00',
    profit: '420.00',
    salesCount: 6,
    averageTicket: '158.33',
  },
  stock: { activeProducts: 8, outOfStock: 3, lowStock: 5 },
  recentSales: [
    {
      id: 'sale-1',
      createdAt: '2026-09-06T15:00:00Z',
      soldBy: { id: 'seller', name: 'Vendedor' },
      units: 4,
      totalAmount: '200.00',
      paymentMethod: 'PIX',
      totalProfit: '80.00',
    },
  ],
  revenueLast7Days: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-09-0${index + 1}`,
    revenue: index === 0 ? '0.00' : '100.00',
  })),
};
const fetchMock = vi.fn<typeof fetch>();
const response = (data: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
const success = (data: unknown) =>
  response({ data, message: null, meta: null });
function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function mockApi(user = admin, data: unknown = dashboard) {
  fetchMock.mockImplementation((input) =>
    String(input).endsWith('/auth/me') ? success({ user }) : success(data),
  );
}

describe('operational dashboard', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  it('shows loading then ADMIN cards formatted in BRL, chart and recent sales', async () => {
    let resolveDashboard: ((value: Response) => void) | undefined;
    fetchMock.mockImplementation((input) =>
      String(input).endsWith('/auth/me')
        ? success({ user: admin })
        : new Promise<Response>((resolve) => {
            resolveDashboard = resolve;
          }),
    );
    renderDashboard();
    expect(await screen.findByText('Carregando indicadores...')).toBeVisible();
    resolveDashboard?.(await success(dashboard));
    expect(await screen.findByText('R$ 950,00')).toBeVisible();
    expect(screen.getByText('R$ 530,00')).toBeVisible();
    expect(screen.getByText('R$ 420,00')).toBeVisible();
    expect(
      screen.getByLabelText('Gráfico de faturamento dos últimos 7 dias'),
    ).toBeVisible();
    expect(screen.getAllByText('Vendedor')).toHaveLength(2);
    expect(screen.getByText('4')).toBeVisible();
  });
  it('does not render cost or profit for VENDEDOR', async () => {
    const sellerData = {
      ...dashboard,
      today: { revenue: '950.00', salesCount: 6, averageTicket: '158.33' },
      recentSales: dashboard.recentSales.map((sale) => ({
        ...sale,
        totalProfit: undefined,
      })),
    };
    mockApi(seller, sellerData);
    renderDashboard();
    expect(await screen.findByText('R$ 950,00')).toBeVisible();
    expect(screen.queryByText('Custo')).not.toBeInTheDocument();
    expect(screen.queryByText('Lucro')).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 80,00')).not.toBeInTheDocument();
  });
  it('renders empty sales and products states without broken cards', async () => {
    mockApi(admin, {
      ...dashboard,
      today: {
        revenue: '0.00',
        cost: '0.00',
        profit: '0.00',
        salesCount: 0,
        averageTicket: '0.00',
      },
      stock: { activeProducts: 0, outOfStock: 0, lowStock: 0 },
      recentSales: [],
      revenueLast7Days: dashboard.revenueLast7Days.map((day) => ({
        ...day,
        revenue: '0.00',
      })),
    });
    renderDashboard();
    expect(
      await screen.findByText(
        'Nenhuma venda registrada hoje. Os indicadores financeiros começam em R$ 0,00.',
      ),
    ).toBeVisible();
    expect(screen.getByText('Nenhum produto ativo cadastrado.')).toBeVisible();
    expect(screen.getByText('Nenhuma venda registrada.')).toBeVisible();
  });
  it('shows an API error', async () => {
    fetchMock.mockImplementation((input) =>
      String(input).endsWith('/auth/me')
        ? success({ user: admin })
        : response({ error: { code: 'INTERNAL_ERROR' } }, 500),
    );
    renderDashboard();
    expect(
      await screen.findByText('Não foi possível carregar o dashboard.'),
    ).toBeVisible();
  });
});
