import {
  AlertTriangle,
  Banknote,
  ChartNoAxesCombined,
  CircleDollarSign,
  LogOut,
  Package,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../hooks/useDashboard';

const brl = (value: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
const paymentLabels = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  DEBIT_CARD: 'Débito',
  CREDIT_CARD: 'Crédito',
  OTHER: 'Outro',
};
function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Banknote;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-400">{label}</p>
        <Icon className="text-amber-300" size={20} />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
    </article>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isLoggingOut } = useAuth();
  const dashboard = useDashboard();
  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }
  return (
    <main className="min-h-screen bg-stone-950 px-4 py-5 text-stone-100 sm:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-stone-900 p-5 shadow-2xl sm:p-8 lg:p-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-amber-300 font-black text-stone-950">
              TP
            </span>
            <div>
              <p className="font-semibold">TecPel Gestão</p>
              <p className="text-sm text-stone-400">Visão operacional</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              className="rounded-xl px-3 py-2 text-sm hover:bg-white/5"
              to="/products"
            >
              <Package className="mr-2 inline" size={17} />
              Produtos
            </Link>
            <Link
              className="rounded-xl px-3 py-2 text-sm hover:bg-white/5"
              to="/sales"
            >
              <ShoppingCart className="mr-2 inline" size={17} />
              Vendas
            </Link>
            {user?.role === 'ADMIN' && (
              <Link
                className="rounded-xl px-3 py-2 text-sm hover:bg-white/5"
                to="/purchases"
              >
                <Truck className="mr-2 inline" size={17} />
                Compras
              </Link>
            )}
            <button
              className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-60"
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              <LogOut className="mr-2 inline" size={17} />
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </button>
          </nav>
        </header>
        <section className="pt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">
            Hoje na TecPel
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Bem-vindo, {user?.name}.
          </h1>
        </section>
        {dashboard.isLoading && (
          <div
            role="status"
            className="grid min-h-80 place-items-center text-stone-400"
          >
            Carregando indicadores...
          </div>
        )}
        {dashboard.isError && (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-red-200"
          >
            <p className="font-semibold">
              Não foi possível carregar o dashboard.
            </p>
            <button
              className="mt-3 underline"
              onClick={() => dashboard.refetch()}
            >
              Tentar novamente
            </button>
          </div>
        )}
        {dashboard.data && (
          <div className="mt-8 space-y-6">
            <section
              className={`grid gap-4 sm:grid-cols-2 ${user?.role === 'ADMIN' ? 'xl:grid-cols-5' : 'lg:grid-cols-3'}`}
              aria-label="Indicadores do dia"
            >
              <MetricCard
                label="Faturamento"
                value={brl(dashboard.data.today.revenue)}
                icon={Banknote}
              />
              {user?.role === 'ADMIN' &&
                dashboard.data.today.cost !== undefined && (
                  <MetricCard
                    label="Custo"
                    value={brl(dashboard.data.today.cost)}
                    icon={CircleDollarSign}
                  />
                )}{' '}
              {user?.role === 'ADMIN' &&
                dashboard.data.today.profit !== undefined && (
                  <MetricCard
                    label="Lucro"
                    value={brl(dashboard.data.today.profit)}
                    icon={TrendingUp}
                  />
                )}
              <MetricCard
                label="Vendas"
                value={String(dashboard.data.today.salesCount)}
                icon={ReceiptText}
              />
              <MetricCard
                label="Ticket médio"
                value={brl(dashboard.data.today.averageTicket)}
                icon={ChartNoAxesCombined}
              />
              {user?.role === 'ADMIN' &&
                dashboard.data.purchasesMonth !== undefined && (
                  <MetricCard
                    label="Compras do mês"
                    value={brl(dashboard.data.purchasesMonth)}
                    icon={Truck}
                  />
                )}
            </section>
            {dashboard.data.today.salesCount === 0 && (
              <p className="rounded-2xl border border-dashed border-white/15 p-5 text-stone-400">
                Nenhuma venda registrada hoje. Os indicadores financeiros
                começam em {brl('0.00')}.
              </p>
            )}
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <section className="rounded-2xl border border-white/10 p-5">
                <h2 className="text-lg font-semibold">Estoque</h2>
                {dashboard.data.stock.activeProducts === 0 ? (
                  <p className="mt-5 rounded-xl bg-amber-300/10 p-4 text-amber-200">
                    Nenhum produto ativo cadastrado.
                  </p>
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-red-400/10 p-4">
                      <AlertTriangle className="text-red-300" />
                      <p className="mt-3 text-3xl font-bold">
                        {dashboard.data.stock.outOfStock}
                      </p>
                      <p className="text-sm text-stone-400">Sem estoque</p>
                    </div>
                    <div className="rounded-xl bg-amber-300/10 p-4">
                      <Package className="text-amber-300" />
                      <p className="mt-3 text-3xl font-bold">
                        {dashboard.data.stock.lowStock}
                      </p>
                      <p className="text-sm text-stone-400">Estoque baixo</p>
                    </div>
                  </div>
                )}
              </section>
              <section className="min-w-0 rounded-2xl border border-white/10 p-5">
                <h2 className="text-lg font-semibold">
                  Faturamento — últimos 7 dias
                </h2>
                <div
                  className="mt-5 h-64"
                  aria-label="Gráfico de faturamento dos últimos 7 dias"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dashboard.data.revenueLast7Days.map((item) => ({
                        ...item,
                        revenue: Number(item.revenue),
                        label: new Date(
                          `${item.date}T12:00:00`,
                        ).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        }),
                      }))}
                    >
                      <CartesianGrid stroke="#ffffff12" vertical={false} />
                      <XAxis dataKey="label" stroke="#a8a29e" />
                      <YAxis
                        stroke="#a8a29e"
                        tickFormatter={(value) => `R$ ${value}`}
                      />
                      <Tooltip
                        formatter={(value) => brl(String(value))}
                        contentStyle={{
                          background: '#1c1917',
                          border: '1px solid #44403c',
                          borderRadius: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Faturamento"
                        stroke="#fcd34d"
                        fill="#fcd34d33"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
            <section className="rounded-2xl border border-white/10 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Últimas vendas</h2>
                <Link className="text-sm text-amber-300" to="/sales">
                  Ver todas
                </Link>
              </div>
              {dashboard.data.recentSales.length === 0 ? (
                <p className="py-10 text-center text-stone-400">
                  Nenhuma venda registrada.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-stone-400">
                      <tr>
                        <th className="py-3">Horário</th>
                        <th>Vendedor</th>
                        <th>Unidades</th>
                        <th>Pagamento</th>
                        <th>Total</th>
                        {user?.role === 'ADMIN' && <th>Lucro</th>}
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.data.recentSales.map((sale) => (
                        <tr className="border-t border-white/10" key={sale.id}>
                          <td className="py-4">
                            {new Date(sale.createdAt).toLocaleString('pt-BR')}
                          </td>
                          <td>{sale.soldBy.name}</td>
                          <td>{sale.units}</td>
                          <td>{paymentLabels[sale.paymentMethod]}</td>
                          <td>{brl(sale.totalAmount)}</td>
                          {user?.role === 'ADMIN' && (
                            <td className="text-emerald-300">
                              {sale.totalProfit ? brl(sale.totalProfit) : '—'}
                            </td>
                          )}
                          <td>
                            <Link
                              className="text-amber-300"
                              to={`/sales/${sale.id}`}
                            >
                              Detalhes
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
