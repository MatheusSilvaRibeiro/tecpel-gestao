import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ProductShell,
  buttonClass,
  fieldClass,
} from '../components/products/ProductShell';
import { usePurchases } from '../hooks/usePurchases';

const brl = (value: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
export function PurchasesPage() {
  const [supplier, setSupplier] = useState('');
  const purchases = usePurchases({ supplier: supplier || undefined });
  return (
    <ProductShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-amber-300">
            Estoque
          </p>
          <h1 className="mt-2 text-3xl font-bold">Compras</h1>
        </div>
        <Link className={buttonClass} to="/purchases/new">
          <Plus className="mr-2 inline" size={18} />
          Nova compra
        </Link>
      </div>
      <label className="mt-6 block max-w-sm">
        Fornecedor
        <input
          aria-label="Fornecedor"
          className={`${fieldClass} mt-1`}
          value={supplier}
          onChange={(event) => setSupplier(event.target.value)}
          placeholder="Filtrar por fornecedor"
        />
      </label>
      {purchases.isLoading && (
        <p className="py-16 text-center text-stone-400">
          Carregando compras...
        </p>
      )}
      {purchases.isError && (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-red-400/10 p-4 text-red-300"
        >
          Não foi possível carregar as compras.
        </p>
      )}
      {purchases.data?.length === 0 && (
        <p className="py-16 text-center text-stone-400">
          Nenhuma compra registrada ainda.
        </p>
      )}
      {!!purchases.data?.length && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/[0.04] text-stone-400">
              <tr>
                <th className="p-4">Data</th>
                <th>Fornecedor</th>
                <th>Nota fiscal</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Registrada por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {purchases.data.map((purchase) => (
                <tr className="border-t border-white/10" key={purchase.id}>
                  <td className="p-4">
                    {new Date(purchase.purchaseDate).toLocaleDateString(
                      'pt-BR',
                    )}
                  </td>
                  <td>{purchase.supplierName || '—'}</td>
                  <td>{purchase.invoiceNumber || '—'}</td>
                  <td>{purchase.itemsCount}</td>
                  <td>{brl(purchase.totalAmount)}</td>
                  <td>{purchase.createdBy.name}</td>
                  <td>
                    <Link
                      className="text-amber-300"
                      to={`/purchases/${purchase.id}`}
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
    </ProductShell>
  );
}
