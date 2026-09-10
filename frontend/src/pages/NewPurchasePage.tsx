import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ProductShell,
  buttonClass,
  fieldClass,
} from '../components/products/ProductShell';
import { useProducts } from '../hooks/useProducts';
import { useCreatePurchase } from '../hooks/usePurchases';
import { ApiError } from '../services/api-client';

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitCost: string;
}
const brl = (value: number | string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
export function NewPurchasePage() {
  const products = useProducts({ active: 'true' });
  const create = useCreatePurchase();
  const navigate = useNavigate();
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);
  const [error, setError] = useState('');
  const selected = products.data?.find((product) => product.id === productId);
  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.quantity * Number(item.unitCost),
        0,
      ),
    [items],
  );
  function addItem() {
    setError('');
    if (
      !selected ||
      quantity <= 0 ||
      !/^\d{1,8}(\.\d{1,2})?$/.test(unitCost) ||
      Number(unitCost) <= 0
    ) {
      setError('Selecione um produto e informe quantidade e custo válidos.');
      return;
    }
    if (items.some((item) => item.productId === selected.id)) {
      setError('Este produto já foi adicionado à compra.');
      return;
    }
    setItems([
      ...items,
      { productId: selected.id, name: selected.name, quantity, unitCost },
    ]);
    setProductId('');
    setQuantity(1);
    setUnitCost('');
  }
  async function submit() {
    setError('');
    if (!purchaseDate || items.length === 0) {
      setError('Informe a data e adicione ao menos um produto.');
      return;
    }
    try {
      const purchase = await create.mutateAsync({
        purchaseDate,
        supplierName,
        invoiceNumber,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      });
      navigate(`/purchases/${purchase.id}`, {
        state: { message: 'Compra registrada com sucesso.' },
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Não foi possível registrar a compra.',
      );
    }
  }
  return (
    <ProductShell>
      <p className="text-sm uppercase tracking-widest text-amber-300">
        Estoque
      </p>
      <h1 className="mt-2 text-3xl font-bold">Nova compra</h1>
      <section className="mt-6 grid gap-4 rounded-2xl border border-white/10 p-5 sm:grid-cols-3">
        <label>
          Data da compra
          <input
            aria-label="Data da compra"
            className={`${fieldClass} mt-1`}
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </label>
        <label>
          Fornecedor (opcional)
          <input
            aria-label="Fornecedor"
            className={`${fieldClass} mt-1`}
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />
        </label>
        <label>
          Nota fiscal (opcional)
          <input
            aria-label="Nota fiscal"
            className={`${fieldClass} mt-1`}
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
        </label>
      </section>
      <section className="mt-6 rounded-2xl border border-white/10 p-5">
        <h2 className="text-xl font-semibold">Adicionar produto</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_140px_180px_auto]">
          <label>
            Produto
            <select
              aria-label="Produto"
              className={`${fieldClass} mt-1`}
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Selecione</option>
              {products.data?.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — estoque {product.currentStock}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantidade
            <input
              aria-label="Quantidade"
              className={`${fieldClass} mt-1`}
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <label>
            Custo unitário
            <input
              aria-label="Custo unitário"
              className={`${fieldClass} mt-1`}
              inputMode="decimal"
              placeholder="35.90"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={`${buttonClass} self-end`}
            onClick={addItem}
          >
            <Plus className="mr-1 inline" size={17} />
            Adicionar
          </button>
        </div>
        {selected && (
          <p className="mt-4 rounded-xl bg-white/[0.03] p-3">
            <strong>{selected.name}</strong>
            <span className="ml-2 text-sm text-stone-400">
              {selected.brand || 'Sem marca'} · estoque atual:{' '}
              {selected.currentStock}
            </span>
          </p>
        )}
      </section>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-400/10 p-4 text-red-300"
        >
          {error}
        </p>
      )}
      <section className="mt-6">
        <h2 className="text-xl font-semibold">Itens da compra</h2>
        {items.length === 0 ? (
          <p className="py-8 text-stone-400">Nenhum produto adicionado.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="text-stone-400">
                <tr>
                  <th className="py-3">Produto</th>
                  <th>Quantidade</th>
                  <th>Custo</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className="border-t border-white/10" key={item.productId}>
                    <td className="py-4">{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{brl(item.unitCost)}</td>
                    <td>{brl(item.quantity * Number(item.unitCost))}</td>
                    <td>
                      <button
                        aria-label={`Remover ${item.name}`}
                        onClick={() =>
                          setItems(
                            items.filter(
                              (candidate) =>
                                candidate.productId !== item.productId,
                            ),
                          )
                        }
                      >
                        <Trash2 className="text-red-300" size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
          <strong className="text-2xl">Total: {brl(total)}</strong>
          <button
            className={buttonClass}
            disabled={create.isPending || items.length === 0}
            onClick={submit}
          >
            {create.isPending ? 'Registrando...' : 'Finalizar compra'}
          </button>
        </div>
      </section>
    </ProductShell>
  );
}
