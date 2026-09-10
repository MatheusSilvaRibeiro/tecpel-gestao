import { useParams } from 'react-router-dom';
import { ProductShell } from '../components/products/ProductShell';
import { usePurchase } from '../hooks/usePurchases';
import { productImageSrc } from '../services/products-api';

const brl = (value: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
export function PurchaseDetailPage() {
  const { id = '' } = useParams();
  const purchase = usePurchase(id);
  return (
    <ProductShell>
      {purchase.isLoading ? (
        <p>Carregando compra...</p>
      ) : purchase.isError || !purchase.data ? (
        <p role="alert" className="text-red-300">
          Compra não encontrada.
        </p>
      ) : (
        <>
          <p className="text-sm uppercase tracking-widest text-amber-300">
            Compra
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {purchase.data.supplierName || 'Fornecedor não informado'}
          </h1>
          <dl className="mt-6 grid gap-4 rounded-2xl border border-white/10 p-5 sm:grid-cols-4">
            <div>
              <dt className="text-stone-400">Data</dt>
              <dd>
                {new Date(purchase.data.purchaseDate).toLocaleDateString(
                  'pt-BR',
                )}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400">Nota fiscal</dt>
              <dd>{purchase.data.invoiceNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-stone-400">Registrada por</dt>
              <dd>{purchase.data.createdBy.name}</dd>
            </div>
            <div>
              <dt className="text-stone-400">Total</dt>
              <dd className="font-bold text-amber-300">
                {brl(purchase.data.totalAmount)}
              </dd>
            </div>
          </dl>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="text-stone-400">
                <tr>
                  <th className="py-3">Produto</th>
                  <th>Quantidade</th>
                  <th>Custo unitário</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {purchase.data.items?.map((item) => (
                  <tr className="border-t border-white/10" key={item.id}>
                    <td className="flex items-center gap-3 py-4">
                      {item.product.imageUrl ? (
                        <img
                          className="size-10 rounded-lg object-cover"
                          src={productImageSrc(item.product.imageUrl)!}
                          alt=""
                        />
                      ) : (
                        <span className="size-10 rounded-lg bg-stone-800" />
                      )}
                      <span>
                        {item.product.name}
                        <small className="block text-stone-500">
                          {item.product.brand}
                        </small>
                      </span>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{brl(item.unitCost)}</td>
                    <td>{brl(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ProductShell>
  );
}
