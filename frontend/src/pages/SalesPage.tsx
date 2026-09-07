import { Plus, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductShell, buttonClass } from '../components/products/ProductShell';
import { useSales } from '../hooks/useSales';

const paymentLabels = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  DEBIT_CARD: 'Cartão de débito',
  CREDIT_CARD: 'Cartão de crédito',
  OTHER: 'Outro',
};
export function SalesPage() {
  const sales = useSales();
  return (
    <ProductShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-amber-300">
            Operação
          </p>
          <h1 className="mt-2 text-3xl font-bold">Vendas</h1>
        </div>
        <Link className={buttonClass} to="/sales/new">
          <Plus className="mr-2 inline" size={18} />
          Nova venda
        </Link>
      </div>
      {sales.isLoading && (
        <p className="py-16 text-center text-stone-400">Carregando vendas...</p>
      )}
      {sales.isError && (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-red-400/10 p-4 text-red-300"
        >
          Não foi possível carregar as vendas.
        </p>
      )}
      {sales.data?.length === 0 && (
        <p className="py-16 text-center text-stone-400">
          Nenhuma venda registrada.
        </p>
      )}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-white/[0.04] text-stone-400">
            <tr>
              <th className="p-4">Data</th>
              <th>Vendedor</th>
              <th>Pagamento</th>
              <th>Total</th>
              <th>Lucro</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sales.data?.map((sale) => (
              <tr className="border-t border-white/10" key={sale.id}>
                <td className="p-4">
                  {new Date(sale.createdAt).toLocaleString('pt-BR')}
                </td>
                <td>{sale.soldBy.name}</td>
                <td>{paymentLabels[sale.paymentMethod]}</td>
                <td>R$ {sale.totalAmount.replace('.', ',')}</td>
                <td className="text-emerald-300">
                  R$ {sale.totalProfit.replace('.', ',')}
                </td>
                <td>
                  <Link className="text-amber-300" to={`/sales/${sale.id}`}>
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link
        className="mt-6 inline-flex items-center gap-2 text-stone-400 hover:text-white"
        to="/dashboard"
      >
        <ShoppingCart size={17} />
        Voltar ao início
      </Link>
    </ProductShell>
  );
}
