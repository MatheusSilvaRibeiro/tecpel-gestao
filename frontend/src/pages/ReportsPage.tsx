import { useMemo, useState } from 'react';
import { Download, FileBarChart } from 'lucide-react';
import {
  ProductShell,
  buttonClass,
  fieldClass,
} from '../components/products/ProductShell';
import { useAuth } from '../hooks/useAuth';
import { usePaymentMethods, useReport } from '../hooks/useReports';
import {
  reportExportUrl,
  type PurchaseReport,
  type ReportFilters,
  type ReportTab,
  type SaleReport,
  type StockReport,
} from '../services/reports-api';
const iso = (d: Date) => d.toISOString().slice(0, 10),
  today = () => iso(new Date()),
  firstMonth = () => {
    const d = new Date();
    return iso(new Date(d.getFullYear(), d.getMonth(), 1));
  };
const brl = (v: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(v),
  );
const date = (v: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(v));
const payment: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  DEBIT_CARD: 'Débito',
  CREDIT_CARD: 'Crédito',
  OTHER: 'Outro',
};
const movement: Record<string, string> = {
  ENTRY: 'Entrada',
  ADJUSTMENT: 'Ajuste',
  SALE: 'Venda',
};
const periodPresets: Array<[string, string]> = [
  ['Hoje', 'today'],
  ['Últimos 7 dias', '7'],
  ['Últimos 30 dias', '30'],
  ['Este mês', 'month'],
];
function preset(
  kind: string,
  set: (value: { startDate: string; endDate: string }) => void,
) {
  const end = new Date(),
    start = new Date();
  if (kind === '7') start.setDate(end.getDate() - 6);
  else if (kind === '30') start.setDate(end.getDate() - 29);
  else if (kind === 'month') start.setDate(1);
  set({ startDate: iso(start), endDate: iso(end) });
}
export function ReportsPage() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const [tabs] = useState<ReportTab[]>(
    admin ? ['sales', 'purchases', 'stock'] : ['sales', 'stock'],
  );
  const [tab, setTab] = useState<ReportTab>('sales');
  const [draft, setDraft] = useState({
    startDate: firstMonth(),
    endDate: today(),
  });
  const [filters, setFilters] = useState<ReportFilters>({
    ...draft,
    page: 1,
    pageSize: 20,
  });
  const report = useReport(tab, filters),
    payments = usePaymentMethods(filters, tab === 'sales');
  const data = report.data;
  const meta =
    tab === 'stock'
      ? (data as StockReport | undefined)?.meta
      : tab === 'sales'
        ? (data as SaleReport | undefined)?.records.meta
        : (data as PurchaseReport | undefined)?.records.meta;
  const update = (next: Partial<ReportFilters>) =>
    setFilters((f) => ({ ...f, ...next }));
  const exportUrl = useMemo(
    () => reportExportUrl(tab, filters),
    [tab, filters],
  );
  return (
    <ProductShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-widest text-amber-300">
            Consulta operacional
          </p>
          <h1 className="mt-2 text-3xl font-bold">Relatórios</h1>
        </div>
        <a className={buttonClass} href={exportUrl}>
          <Download className="mr-2 inline" size={18} />
          Exportar CSV
        </a>
      </div>
      <div className="mt-6 flex gap-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`rounded-xl px-4 py-2 ${tab === t ? 'bg-amber-300 text-stone-950' : 'border border-white/10'}`}
            onClick={() => {
              setTab(t);
              update({ page: 1 });
            }}
          >
            {t === 'sales'
              ? 'Vendas'
              : t === 'purchases'
                ? 'Compras'
                : 'Estoque'}
          </button>
        ))}
      </div>
      <section className="mt-5 rounded-2xl border border-white/10 p-4">
        <div className="flex flex-wrap gap-2">
          {periodPresets.map(([label, key]) => (
            <button
              type="button"
              key={key}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm"
              onClick={() =>
                key === 'today'
                  ? setDraft({ startDate: today(), endDate: today() })
                  : preset(key, setDraft)
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label>
            Início
            <input
              aria-label="Data inicial"
              className={fieldClass}
              type="date"
              value={draft.startDate}
              onChange={(e) =>
                setDraft({ ...draft, startDate: e.target.value })
              }
            />
          </label>
          <label>
            Fim
            <input
              aria-label="Data final"
              className={fieldClass}
              type="date"
              value={draft.endDate}
              onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
            />
          </label>
          <button
            className={buttonClass}
            onClick={() => setFilters({ ...filters, ...draft, page: 1 })}
          >
            Aplicar filtros
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {tab === 'sales' && (
            <select
              aria-label="Forma de pagamento"
              className={fieldClass}
              value={filters.paymentMethod ?? ''}
              onChange={(e) =>
                update({ paymentMethod: e.target.value || undefined, page: 1 })
              }
            >
              <option value="">Todas as formas de pagamento</option>
              {Object.entries(payment).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
          {tab === 'purchases' && (
            <input
              aria-label="Fornecedor"
              className={fieldClass}
              placeholder="Filtrar fornecedor"
              value={filters.supplier ?? ''}
              onChange={(e) =>
                update({ supplier: e.target.value || undefined, page: 1 })
              }
            />
          )}
          {tab === 'stock' && (
            <select
              aria-label="Tipo de movimentação"
              className={fieldClass}
              value={filters.movementType ?? ''}
              onChange={(e) =>
                update({ movementType: e.target.value || undefined, page: 1 })
              }
            >
              <option value="">Todos os tipos</option>
              {Object.entries(movement).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>
      {report.isLoading && (
        <p className="mt-8 text-stone-400">Carregando relatório...</p>
      )}
      {report.isError && (
        <p role="alert" className="mt-8 text-red-300">
          Não foi possível carregar o relatório.
        </p>
      )}
      {data && (
        <>
          {tab === 'sales' ? (
            <Sales
              data={data as SaleReport}
              admin={admin}
              payments={payments.data ?? []}
            />
          ) : tab === 'purchases' ? (
            <Purchases data={data as PurchaseReport} />
          ) : (
            <Stock data={data as StockReport} />
          )}{' '}
          {meta && meta.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                disabled={meta.page <= 1}
                onClick={() => update({ page: meta.page - 1 })}
              >
                Anterior
              </button>
              <span>
                Página {meta.page} de {meta.totalPages}
              </span>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => update({ page: meta.page + 1 })}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </ProductShell>
  );
}
function Cards({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map(([label, value]) => (
        <article key={label} className="rounded-2xl border border-white/10 p-4">
          <p className="text-sm text-stone-400">{label}</p>
          <strong className="mt-2 block text-xl">{value}</strong>
        </article>
      ))}
    </div>
  );
}
function Sales({
  data,
  admin,
  payments,
}: {
  data: SaleReport;
  admin: boolean;
  payments: Array<{
    paymentMethod: string;
    salesCount: number;
    totalAmount: string;
  }>;
}) {
  const s = data.summary;
  return (
    <>
      <Cards
        items={[
          ['Faturamento', brl(s.revenue)],
          ['Vendas', String(s.salesCount)],
          ['Ticket médio', brl(s.averageTicket)],
          ...(admin
            ? ([
                ['Custo', brl(s.cost ?? '0')],
                ['Lucro', brl(s.profit ?? '0')],
              ] as Array<[string, string]>)
            : []),
        ]}
      />
      <h2 className="mt-7 text-xl font-semibold">Formas de pagamento</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {payments.map((p) => (
          <span
            key={p.paymentMethod}
            className="rounded-xl bg-white/5 px-4 py-3"
          >
            {payment[p.paymentMethod]}: {p.salesCount} · {brl(p.totalAmount)}
          </span>
        ))}
      </div>
      <Table
        headers={[
          'Data',
          'Vendedor',
          'Pagamento',
          'Itens',
          'Total',
          ...(admin ? ['Custo', 'Lucro'] : []),
        ]}
        rows={data.records.data.map((r) => [
          date(r.createdAt),
          r.seller.name,
          payment[r.paymentMethod] ?? r.paymentMethod,
          r.itemsCount,
          brl(r.totalAmount),
          ...(admin
            ? [brl(r.totalCost ?? '0'), brl(r.totalProfit ?? '0')]
            : []),
        ])}
        empty="Nenhuma venda encontrada no período selecionado."
      />
    </>
  );
}
function Purchases({ data }: { data: PurchaseReport }) {
  return (
    <>
      <Cards
        items={[
          ['Total comprado', brl(data.summary.totalPurchased)],
          ['Compras', String(data.summary.purchasesCount)],
        ]}
      />
      <Table
        headers={[
          'Data',
          'Fornecedor',
          'Nota',
          'Itens',
          'Total',
          'Responsável',
        ]}
        rows={data.records.data.map((r) => [
          date(r.purchaseDate),
          r.supplierName ?? '—',
          r.invoiceNumber ?? '—',
          r.itemsCount,
          brl(r.totalAmount),
          r.createdBy.name,
        ])}
        empty="Nenhuma compra encontrada no período selecionado."
      />
    </>
  );
}
function Stock({ data }: { data: StockReport }) {
  return (
    <>
      <div className="mt-6 flex items-center gap-2 text-stone-400">
        <FileBarChart />
        Movimentações no período
      </div>
      <Table
        headers={[
          'Data',
          'Produto',
          'Tipo',
          'Quantidade',
          'Responsável',
          'Observação',
        ]}
        rows={data.data.map((r) => [
          date(r.createdAt),
          r.product.name,
          movement[r.type] ?? r.type,
          r.quantity,
          r.user.name,
          r.note ?? '—',
        ])}
        empty="Nenhuma movimentação encontrada no período selecionado."
      />
    </>
  );
}
function Table({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
  empty: string;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
      {rows.length === 0 ? (
        <p className="p-8 text-center text-stone-400">{empty}</p>
      ) : (
        <table className="w-full min-w-[700px] text-left">
          <thead>
            <tr>
              {headers.map((h) => (
                <th className="p-4 text-stone-400" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr className="border-t border-white/10" key={i}>
                {row.map((cell, j) => (
                  <td className="p-4" key={j}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
