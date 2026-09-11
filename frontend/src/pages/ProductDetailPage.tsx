import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Power } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import {
  ProductShell,
  buttonClass,
  fieldClass,
} from '../components/products/ProductShell';
import { useAuth } from '../hooks/useAuth';
import {
  useProduct,
  useProductMutations,
  useProductCost,
  useProductStock,
} from '../hooks/useProducts';
import { productImageSrc } from '../services/products-api';

const entrySchema = z.object({
  quantity: z.number().int().positive('Informe uma quantidade positiva.'),
  unitCost: z
    .string()
    .regex(/^\d{1,8}(\.\d{1,2})?$/, 'Informe um custo válido.')
    .refine((value) => Number(value) > 0),
});
const adjustmentSchema = z.object({
  quantity: z
    .number()
    .int()
    .refine((value) => value !== 0, 'A quantidade não pode ser zero.'),
  note: z.string().trim().min(1, 'Informe o motivo.'),
});
type EntryValues = z.infer<typeof entrySchema>;
type AdjustmentValues = z.infer<typeof adjustmentSchema>;

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const product = useProduct(id);
  const stock = useProductStock(id);
  const isAdmin = user?.role === 'ADMIN';
  const cost = useProductCost(id, isAdmin);
  const mutations = useProductMutations(id);
  const navigate = useNavigate();
  const entry = useForm<EntryValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: { quantity: 1, unitCost: '' },
  });
  const adjustment = useForm<AdjustmentValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { quantity: 1, note: '' },
  });

  if (product.isLoading)
    return (
      <ProductShell>
        <p>Carregando produto...</p>
      </ProductShell>
    );
  if (product.isError || !product.data)
    return (
      <ProductShell>
        <p role="alert" className="text-red-300">
          Produto não encontrado.
        </p>
      </ProductShell>
    );
  const item = product.data;
  return (
    <ProductShell>
      <section className="grid gap-7 md:grid-cols-[280px_1fr]">
        <div className="grid min-h-64 place-items-center overflow-hidden rounded-2xl bg-stone-800">
          {item.imageUrl ? (
            <img
              className="h-full w-full object-cover"
              src={productImageSrc(item.imageUrl)!}
              alt={`Foto de ${item.name}`}
            />
          ) : (
            <span className="text-stone-500">Sem foto</span>
          )}
        </div>
        <div>
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-widest text-amber-300">
                {item.type === 'PERFUME' ? 'Perfume' : 'Creme'}
              </p>
              <h1 className="mt-2 text-4xl font-bold">{item.name}</h1>
              <p className="mt-1 text-stone-400">{item.brand || 'Sem marca'}</p>
            </div>
            <span
              className={item.active ? 'text-emerald-300' : 'text-stone-500'}
            >
              {item.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className="mt-6 text-stone-300">
            {item.description || 'Sem descrição.'}
          </p>
          {isAdmin && (
            <div className="mt-6 rounded-xl border border-white/10 p-4">
              <h2 className="font-semibold">Custo e margem</h2>
              {cost.isLoading ? (
                <p className="mt-2 text-stone-400">Carregando custos...</p>
              ) : cost.data ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <p>
                    <span className="block text-sm text-stone-500">
                      Último custo
                    </span>
                    {`R$ ${cost.data.lastUnitCost.replace('.', ',')}`}
                  </p>
                  <p>
                    <span className="block text-sm text-stone-500">
                      Última compra
                    </span>
                    {new Date(cost.data.lastPurchaseDate).toLocaleDateString(
                      'pt-BR',
                    )}
                  </p>
                  <p>
                    <span className="block text-sm text-stone-500">
                      Margem bruta atual
                    </span>
                    {`R$ ${cost.data.grossMarginValue.replace('.', ',')} (${cost.data.grossMarginPercent.replace('.', ',')}%)`}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-stone-400">Sem histórico de compras.</p>
              )}
            </div>
          )}
          <div className="mt-7 flex gap-8">
            <div>
              <span className="block text-sm text-stone-500">Preço</span>
              <strong className="text-xl">
                R$ {item.salePrice.replace('.', ',')}
              </strong>
            </div>
            <div>
              <span className="block text-sm text-stone-500">
                Estoque atual
              </span>
              <strong className="text-xl">
                {stock.data?.currentStock ?? item.currentStock} un.
              </strong>
            </div>
          </div>
          {isAdmin && (
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className={buttonClass} to={`/products/${id}/edit`}>
                <Pencil className="mr-2 inline" size={17} />
                Editar
              </Link>
              {item.active && (
                <button
                  type="button"
                  className="rounded-xl border border-red-400/30 px-4 py-2 text-red-300"
                  onClick={async () => {
                    if (confirm('Desativar este produto?')) {
                      await mutations.deactivate.mutateAsync();
                      navigate('/products');
                    }
                  }}
                >
                  <Power className="mr-2 inline" size={17} />
                  Desativar
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {isAdmin && item.active && (
        <section className="mt-10 grid gap-5 border-t border-white/10 pt-8 md:grid-cols-2">
          <form
            className="rounded-2xl bg-white/[0.03] p-5"
            onSubmit={entry.handleSubmit(async (values) => {
              await mutations.entry.mutateAsync(values);
              entry.reset();
            })}
          >
            <h2 className="text-xl font-semibold">Entrada de estoque</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label>
                Quantidade
                <input
                  className={`${fieldClass} mt-1`}
                  type="number"
                  {...entry.register('quantity', { valueAsNumber: true })}
                />
              </label>
              <label>
                Custo unitário
                <input
                  className={`${fieldClass} mt-1`}
                  placeholder="32.50"
                  {...entry.register('unitCost')}
                />
              </label>
            </div>
            {Object.values(entry.formState.errors)[0]?.message && (
              <p role="alert" className="mt-2 text-red-300">
                {Object.values(entry.formState.errors)[0]?.message}
              </p>
            )}
            <button className={`${buttonClass} mt-4`} type="submit">
              Registrar entrada
            </button>
          </form>
          <form
            className="rounded-2xl bg-white/[0.03] p-5"
            onSubmit={adjustment.handleSubmit(async (values) => {
              await mutations.adjustment.mutateAsync(values);
              adjustment.reset();
            })}
          >
            <h2 className="text-xl font-semibold">Ajuste de estoque</h2>
            <p className="mt-1 text-sm text-stone-400">
              Positivo adiciona; negativo remove.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label>
                Quantidade com sinal
                <input
                  className={`${fieldClass} mt-1`}
                  type="number"
                  {...adjustment.register('quantity', { valueAsNumber: true })}
                />
              </label>
              <label>
                Motivo
                <input
                  className={`${fieldClass} mt-1`}
                  {...adjustment.register('note')}
                />
              </label>
            </div>
            {Object.values(adjustment.formState.errors)[0]?.message && (
              <p role="alert" className="mt-2 text-red-300">
                {Object.values(adjustment.formState.errors)[0]?.message}
              </p>
            )}
            <button className={`${buttonClass} mt-4`} type="submit">
              Registrar ajuste
            </button>
          </form>
        </section>
      )}

      <section className="mt-10 border-t border-white/10 pt-8">
        <h2 className="text-2xl font-semibold">Movimentações</h2>
        {stock.isLoading && (
          <p className="mt-4 text-stone-400">Carregando estoque...</p>
        )}
        {stock.data?.movements.length === 0 && (
          <p className="mt-4 text-stone-400">
            Nenhuma movimentação registrada.
          </p>
        )}
        <ul className="mt-4 divide-y divide-white/10">
          {stock.data?.movements.map((movement) => (
            <li
              className="flex flex-wrap justify-between gap-3 py-4"
              key={movement.id}
            >
              <div>
                <strong>
                  {movement.type === 'ENTRY'
                    ? 'Entrada'
                    : movement.type === 'SALE'
                      ? 'Venda'
                      : 'Ajuste'}
                </strong>
                <p className="text-sm text-stone-400">
                  {movement.note ||
                    (movement.unitCost
                      ? `Custo: R$ ${movement.unitCost.replace('.', ',')}`
                      : '')}
                </p>
              </div>
              <div className="text-right">
                <strong
                  className={
                    movement.quantity > 0 ? 'text-emerald-300' : 'text-red-300'
                  }
                >
                  {movement.quantity > 0 ? '+' : ''}
                  {movement.quantity}
                </strong>
                <p className="text-sm text-stone-500">
                  {movement.createdBy.name}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </ProductShell>
  );
}
