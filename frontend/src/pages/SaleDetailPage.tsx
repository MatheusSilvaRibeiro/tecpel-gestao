import { Link, useLocation, useParams } from 'react-router-dom';
import { ProductShell } from '../components/products/ProductShell';
import { useSale } from '../hooks/useSales';

const labels = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  DEBIT_CARD: 'Cartão de débito',
  CREDIT_CARD: 'Cartão de crédito',
  OTHER: 'Outro',
};
export function SaleDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const sale = useSale(id);
  return (
    <ProductShell>
      {location.state?.created && (
        <p
          role="status"
          className="mb-6 rounded-xl bg-emerald-400/10 p-4 text-emerald-300"
        >
          Venda registrada com sucesso.
        </p>
      )}
      {sale.isLoading && (
        <p className="py-16 text-center text-stone-400">Carregando venda...</p>
      )}
      {sale.isError && (
        <p role="alert" className="rounded-xl bg-red-400/10 p-4 text-red-300">
          Não foi possível carregar a venda.
        </p>
      )}
      {sale.data && (
        <>
          <p className="text-sm uppercase tracking-widest text-amber-300">
            Venda
          </p>
          <h1 className="mt-2 text-3xl font-bold">Detalhes da venda</h1>
          <section className="mt-6 grid gap-4 rounded-2xl border border-white/10 p-5 sm:grid-cols-3">
            <div>
              <span className="text-stone-400">Vendedor</span>
              <p>{sale.data.soldBy.name}</p>
            </div>
            <div>
              <span className="text-stone-400">Pagamento</span>
              <p>{labels[sale.data.paymentMethod]}</p>
            </div>
            <div>
              <span className="text-stone-400">Data</span>
              <p>{new Date(sale.data.createdAt).toLocaleString('pt-BR')}</p>
            </div>
          </section>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="text-stone-400">
                  <th className="py-3">Produto</th>
                  <th>Qtd.</th>
                  <th>Preço</th>
                  <th>Subtotal</th>
                  <th>Custo</th>
                  <th>Lucro</th>
                </tr>
              </thead>
              <tbody>
                {sale.data.items?.map((item) => (
                  <tr className="border-t border-white/10" key={item.id}>
                    <td className="py-4">{item.product.name}</td>
                    <td>{item.quantity}</td>
                    <td>R$ {item.unitPrice.replace('.', ',')}</td>
                    <td>R$ {item.subtotal.replace('.', ',')}</td>
                    <td>R$ {item.unitCost.replace('.', ',')}</td>
                    <td className="text-emerald-300">
                      R$ {item.profit.replace('.', ',')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <section className="ml-auto mt-6 max-w-sm space-y-2 rounded-2xl bg-white/[0.04] p-5">
            <p className="flex justify-between">
              <span>Custo</span>
              <strong>R$ {sale.data.totalCost.replace('.', ',')}</strong>
            </p>
            <p className="flex justify-between">
              <span>Lucro</span>
              <strong>R$ {sale.data.totalProfit.replace('.', ',')}</strong>
            </p>
            <p className="flex justify-between border-t border-white/10 pt-3 text-lg">
              <span>Total</span>
              <strong>R$ {sale.data.totalAmount.replace('.', ',')}</strong>
            </p>
          </section>
        </>
      )}
      <Link className="mt-8 inline-block text-amber-300" to="/sales">
        ← Voltar às vendas
      </Link>
    </ProductShell>
  );
}
