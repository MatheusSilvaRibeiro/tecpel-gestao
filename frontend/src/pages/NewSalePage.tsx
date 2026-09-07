import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import {
  ProductShell,
  buttonClass,
  fieldClass,
} from '../components/products/ProductShell';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';
import { checkoutSchema, type CheckoutValues } from '../schemas/sale';
import { ApiError } from '../services/api-client';
import { createSale } from '../services/sales-api';

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  available: number;
}
const currency = (value: number) => value.toFixed(2).replace('.', ',');

export function NewSalePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const products = useProducts({ active: 'true' });
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [stockError, setStockError] = useState('');
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { paymentMethod: 'PIX' },
  });
  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: (sale) =>
      navigate(`/sales/${sale.id}`, {
        replace: true,
        state: { created: true },
      }),
  });
  const selected = products.data?.find((product) => product.id === productId);
  const total = cart.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );

  function addItem() {
    if (!selected) return;
    if (quantity > selected.currentStock) {
      setStockError(
        `Estoque insuficiente. Disponível: ${selected.currentStock} unidades.`,
      );
      return;
    }
    setStockError('');
    setCart((current) => [
      ...current,
      {
        productId: selected.id,
        name: selected.name,
        quantity,
        unitPrice: selected.salePrice,
        available: selected.currentStock,
      },
    ]);
    setProductId('');
    setQuantity(1);
  }
  function changePrice(index: number, value: string) {
    setCart((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, unitPrice: value } : item,
      ),
    );
  }
  const submit = form.handleSubmit((values) =>
    mutation.mutate({
      paymentMethod: values.paymentMethod,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        ...(user?.role === 'ADMIN' ? { unitPrice: item.unitPrice } : {}),
      })),
    }),
  );

  return (
    <ProductShell>
      <p className="text-sm uppercase tracking-widest text-amber-300">Caixa</p>
      <h1 className="mt-2 text-3xl font-bold">Nova venda</h1>
      <section className="mt-7 grid gap-3 rounded-2xl bg-white/[0.03] p-4 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
        <label>
          <span className="mb-1 block text-sm text-stone-400">Produto</span>
          <select
            aria-label="Produto"
            className={fieldClass}
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            <option value="">Selecione</option>
            {products.data
              ?.filter(
                (product) =>
                  !cart.some((item) => item.productId === product.id),
              )
              .map((product) => (
                <option value={product.id} key={product.id}>
                  {product.name} — R$ {product.salePrice.replace('.', ',')} —{' '}
                  {product.currentStock} un.
                </option>
              ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm text-stone-400">Quantidade</span>
          <input
            aria-label="Quantidade"
            className={fieldClass}
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
        <button
          className={buttonClass}
          type="button"
          onClick={addItem}
          disabled={!selected || quantity < 1}
        >
          <Plus className="mr-1 inline" size={17} />
          Adicionar
        </button>
        {selected && (
          <p className="text-sm text-stone-400 sm:col-span-3">
            Estoque disponível: {selected.currentStock} unidades.
          </p>
        )}
        {stockError && (
          <p role="alert" className="text-sm text-red-300 sm:col-span-3">
            {stockError}
          </p>
        )}
      </section>
      <form className="mt-6" onSubmit={submit}>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="text-stone-400">
                <th className="p-4">Produto</th>
                <th>Qtd.</th>
                <th>Preço</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, index) => (
                <tr className="border-t border-white/10" key={item.productId}>
                  <td className="p-4">{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>
                    {user?.role === 'ADMIN' ? (
                      <input
                        aria-label={`Preço de ${item.name}`}
                        className={`${fieldClass} w-32`}
                        value={item.unitPrice}
                        onChange={(event) =>
                          changePrice(index, event.target.value)
                        }
                      />
                    ) : (
                      `R$ ${item.unitPrice.replace('.', ',')}`
                    )}
                  </td>
                  <td>
                    R$ {currency(Number(item.unitPrice || 0) * item.quantity)}
                  </td>
                  <td>
                    <button
                      aria-label={`Remover ${item.name}`}
                      type="button"
                      onClick={() =>
                        setCart((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <Minus size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cart.length === 0 && (
            <p className="p-8 text-center text-stone-400">
              Adicione produtos ao carrinho.
            </p>
          )}
        </div>
        <div className="mt-6 ml-auto grid max-w-sm gap-4">
          <label>
            <span className="mb-1 block text-sm text-stone-400">
              Forma de pagamento
            </span>
            <select
              aria-label="Forma de pagamento"
              className={fieldClass}
              {...form.register('paymentMethod')}
            >
              <option value="CASH">Dinheiro</option>
              <option value="PIX">Pix</option>
              <option value="DEBIT_CARD">Cartão de débito</option>
              <option value="CREDIT_CARD">Cartão de crédito</option>
              <option value="OTHER">Outro</option>
            </select>
          </label>
          <p className="flex justify-between text-xl">
            <span>Total</span>
            <strong>R$ {currency(total)}</strong>
          </p>
          {mutation.isError && (
            <p role="alert" className="text-red-300">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : 'Não foi possível registrar a venda.'}
            </p>
          )}
          <button
            className={buttonClass}
            disabled={
              cart.length === 0 ||
              mutation.isPending ||
              cart.some(
                (item) =>
                  !/^\d{1,8}(\.\d{1,2})?$/.test(item.unitPrice) ||
                  Number(item.unitPrice) <= 0,
              )
            }
          >
            {mutation.isPending ? 'Finalizando...' : 'Finalizar venda'}
          </button>
        </div>
      </form>
    </ProductShell>
  );
}
