import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  ProductShell,
  buttonClass,
  fieldClass,
} from '../components/products/ProductShell';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';
import { productImageSrc, type ProductType } from '../services/products-api';

export function ProductsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ProductType | ''>('');
  const [active, setActive] = useState('true');
  const products = useProducts({
    search: search || undefined,
    type: type || undefined,
    active,
  });
  return (
    <ProductShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-amber-300">
            Catálogo
          </p>
          <h1 className="mt-2 text-3xl font-bold">Produtos</h1>
        </div>
        {user?.role === 'ADMIN' && (
          <Link className={buttonClass} to="/products/new">
            <Plus className="mr-2 inline" size={18} />
            Novo produto
          </Link>
        )}
      </div>
      <section
        className="mt-7 grid gap-3 rounded-2xl bg-white/[0.03] p-4 sm:grid-cols-3"
        aria-label="Filtros"
      >
        <label>
          <span className="mb-1 block text-sm text-stone-400">Buscar</span>
          <span className="relative block">
            <Search
              className="absolute left-3 top-3 text-stone-500"
              size={17}
            />
            <input
              className={`${fieldClass} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome do produto"
            />
          </span>
        </label>
        <label>
          <span className="mb-1 block text-sm text-stone-400">Tipo</span>
          <select
            className={fieldClass}
            value={type}
            onChange={(event) =>
              setType(event.target.value as ProductType | '')
            }
          >
            <option value="">Todos</option>
            <option value="PERFUME">Perfume</option>
            <option value="CREAM">Creme</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm text-stone-400">Status</span>
          <select
            className={fieldClass}
            value={active}
            onChange={(event) => setActive(event.target.value)}
          >
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
            <option value="">Todos</option>
          </select>
        </label>
      </section>
      {products.isLoading && (
        <p className="py-16 text-center text-stone-400">
          Carregando produtos...
        </p>
      )}
      {products.isError && (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-red-400/10 p-4 text-red-300"
        >
          Não foi possível carregar os produtos.
        </p>
      )}
      {products.data?.length === 0 && (
        <p className="py-16 text-center text-stone-400">
          Nenhum produto encontrado.
        </p>
      )}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.data?.map((product) => (
          <li key={product.id}>
            <Link
              to={`/products/${product.id}`}
              className="block overflow-hidden rounded-2xl border border-white/10 bg-stone-950/60 transition hover:-translate-y-0.5 hover:border-amber-300/40"
            >
              <div className="grid h-36 place-items-center bg-stone-800">
                {product.imageUrl ? (
                  <img
                    className="h-full w-full object-cover"
                    src={productImageSrc(product.imageUrl)!}
                    alt={`Foto de ${product.name}`}
                  />
                ) : (
                  <span className="text-sm text-stone-500">Sem foto</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{product.name}</h2>
                    <p className="text-sm text-stone-400">
                      {product.brand || 'Sem marca'}
                    </p>
                  </div>
                  <span
                    className={
                      product.active ? 'text-emerald-300' : 'text-stone-500'
                    }
                  >
                    {product.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="mt-4 flex justify-between text-sm">
                  <span>R$ {product.salePrice.replace('.', ',')}</span>
                  <strong>{product.currentStock} un.</strong>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </ProductShell>
  );
}
