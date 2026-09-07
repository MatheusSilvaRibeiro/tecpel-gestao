import { ArrowLeft, LogOut, Package, ShoppingCart } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';

export function ProductShell({ children }: PropsWithChildren) {
  const { logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-stone-950 px-4 py-5 text-stone-100 sm:px-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-stone-900 p-5 shadow-2xl sm:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <nav className="flex items-center gap-4" aria-label="Principal">
            <Link
              to="/dashboard"
              className="text-stone-400 hover:text-white"
              aria-label="Voltar ao dashboard"
            >
              <ArrowLeft />
            </Link>
            <Link
              to="/products"
              className="flex items-center gap-2 font-semibold"
            >
              <Package className="text-amber-300" /> Produtos
            </Link>
            <Link to="/sales" className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="text-amber-300" /> Vendas
            </Link>
          </nav>
          <button
            className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
            type="button"
            disabled={isLoggingOut}
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut className="mr-2 inline" size={16} />
            Sair
          </button>
        </header>
        {children}
      </div>
    </main>
  );
}

export const fieldClass =
  'w-full rounded-xl border border-white/10 bg-stone-950 px-3 py-2.5 text-stone-100 outline-none focus:border-amber-300';
export const buttonClass =
  'rounded-xl bg-amber-300 px-4 py-2.5 font-semibold text-stone-950 hover:bg-amber-200 disabled:opacity-50';
