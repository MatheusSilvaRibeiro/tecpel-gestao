import { AlertTriangle, Banknote, PackageX, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ProductShell } from '../components/products/ProductShell';
import { useAnalytics, useInsights } from '../hooks/useAnalytics';
import { useAuth } from '../hooks/useAuth';
const brl = (value: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
export function AnalyticsPage() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const insights = useInsights();
  const isAdmin = user?.role === 'ADMIN';
  if (analytics.isLoading)
    return (
      <ProductShell>
        <p role="status" className="py-20 text-center text-stone-400">
          Carregando análises...
        </p>
      </ProductShell>
    );
  if (analytics.isError || !analytics.data)
    return (
      <ProductShell>
        <p role="alert" className="rounded-xl bg-red-400/10 p-4 text-red-300">
          Não foi possível carregar as análises.
        </p>
      </ProductShell>
    );
  const data = analytics.data;
  const chart = data.revenueEvolution.map((item, index) => ({
    date: new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }),
    revenue: Number(item.value),
    profit: Number(data.profitEvolution?.[index]?.value ?? 0),
  }));
  return (
    <ProductShell>
      <p className="text-sm uppercase tracking-widest text-amber-300">
        Inteligência de negócio
      </p>
      <h1 className="mt-2 text-3xl font-bold">Analytics & Insights</h1>
      <p className="mt-2 text-stone-400">
        Indicadores para orientar estoque, preços e compras.
      </p>
      {isAdmin && (
        <section
          aria-label="Indicadores financeiros"
          className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Card
            icon={Banknote}
            label="Capital investido"
            value={brl(data.investedCapital ?? '0')}
          />
          <Card
            icon={TrendingUp}
            label="Margem média"
            value={`${Number(data.averageMarginPercent ?? 0).toLocaleString('pt-BR')}%`}
          />
          <Card
            icon={AlertTriangle}
            label="Estoque crítico"
            value={String(data.criticalStock.length)}
          />
          <Card
            icon={PackageX}
            label="Produtos parados"
            value={String(data.staleProducts.length)}
          />
        </section>
      )}
      <section className="mt-6 rounded-2xl border border-white/10 p-5">
        <h2 className="text-xl font-semibold">Evolução — últimos 30 dias</h2>
        <div
          className="mt-5 h-72"
          aria-label="Gráfico de evolução de faturamento e lucro"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <CartesianGrid stroke="#ffffff12" vertical={false} />
              <XAxis dataKey="date" stroke="#a8a29e" />
              <YAxis stroke="#a8a29e" />
              <Tooltip
                formatter={(value) => brl(String(value))}
                contentStyle={{
                  background: '#1c1917',
                  border: '1px solid #44403c',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Faturamento"
                stroke="#fcd34d"
                fill="#fcd34d33"
              />
              {isAdmin && (
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Lucro"
                  stroke="#6ee7b7"
                  fill="#6ee7b722"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <PerformanceTable
          title="Produtos mais lucrativos"
          values={data.mostProfitableProducts}
          admin={isAdmin}
        />
        <PerformanceTable
          title="Produtos menos lucrativos"
          values={data.leastProfitableProducts}
          admin={isAdmin}
        />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 p-5">
          <h2 className="text-xl font-semibold">Marcas mais lucrativas</h2>
          {data.profitableBrands.length === 0 ? (
            <p className="mt-5 text-stone-400">
              Ainda não há vendas por marca.
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-white/10">
              {data.profitableBrands.map((brand) => (
                <li
                  className="flex justify-between gap-4 py-3"
                  key={brand.brand}
                >
                  <span>
                    {brand.brand}
                    <small className="block text-stone-500">
                      {brand.quantitySold} unidades
                    </small>
                  </span>
                  <span className="text-right">
                    {brl(brand.revenue)}
                    {isAdmin && (
                      <small className="block text-emerald-300">
                        Lucro: {brl(brand.profit ?? '0')}
                      </small>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="rounded-2xl border border-white/10 p-5">
          <h2 className="text-xl font-semibold">Estoque crítico</h2>
          {data.criticalStock.length === 0 ? (
            <p className="mt-5 text-stone-400">
              Nenhum produto em nível crítico.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-white/10">
              {data.criticalStock.map((item) => (
                <li className="flex justify-between py-3" key={item.product.id}>
                  <span>{item.product.name}</span>
                  <strong
                    className={
                      item.currentStock === 0
                        ? 'text-red-300'
                        : 'text-amber-300'
                    }
                  >
                    {item.currentStock} un.
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 p-5">
          <h2 className="text-xl font-semibold">Produtos parados</h2>
          {data.staleProducts.length === 0 ? (
            <p className="mt-5 text-stone-400">Nenhum produto parado.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/10">
              {data.staleProducts.map((item) => (
                <li
                  className="flex justify-between gap-4 py-3"
                  key={item.product.id}
                >
                  <span>
                    {item.product.name}
                    <small className="block text-stone-500">
                      Estoque: {item.currentStock}
                    </small>
                  </span>
                  {isAdmin && (
                    <span className="text-right">
                      {item.tiedCapital ? brl(item.tiedCapital) : 'Sem custo'}
                      <small className="block text-stone-500">
                        capital parado
                      </small>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-white/10 p-5">
          <h2 className="text-xl font-semibold">Insights</h2>
          {insights.isLoading ? (
            <p className="mt-5 text-stone-400">Gerando insights...</p>
          ) : insights.data?.length ? (
            <ul className="mt-4 space-y-3">
              {insights.data.map((message) => (
                <li
                  className="rounded-xl bg-amber-300/10 p-3 text-amber-100"
                  key={message}
                >
                  {message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-stone-400">
              Nenhum alerta relevante agora.
            </p>
          )}
        </section>
      </div>
    </ProductShell>
  );
}
function Card({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <Icon className="text-amber-300" />
      <p className="mt-3 text-sm text-stone-400">{label}</p>
      <strong className="text-2xl">{value}</strong>
    </article>
  );
}
function PerformanceTable({
  title,
  values,
  admin,
}: {
  title: string;
  values: import('../services/analytics-api').Performance[];
  admin: boolean;
}) {
  return (
    <section className="rounded-2xl border border-white/10 p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      {values.length === 0 ? (
        <p className="mt-5 text-stone-400">Sem vendas no período histórico.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-stone-400">
              <tr>
                <th className="py-2">Produto</th>
                <th>Unidades</th>
                <th>Faturamento</th>
                {admin && <th>Lucro</th>}
              </tr>
            </thead>
            <tbody>
              {values.map((item) => (
                <tr className="border-t border-white/10" key={item.product.id}>
                  <td className="py-3">{item.product.name}</td>
                  <td>{item.quantitySold}</td>
                  <td>{brl(item.revenue)}</td>
                  {admin && (
                    <td className="text-emerald-300">
                      {brl(item.profit ?? '0')}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
