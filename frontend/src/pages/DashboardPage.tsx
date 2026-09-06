import { LogOut, Package } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isLoggingOut } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="min-h-screen bg-stone-950 px-5 py-8 text-stone-100 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col rounded-3xl border border-white/10 bg-stone-900 p-7 shadow-2xl sm:p-10 lg:p-14">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-7">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-amber-300 font-black text-stone-950">
              TP
            </span>
            <div>
              <p className="font-semibold">TecPel Gestão</p>
              <p className="text-sm text-stone-400">Área protegida</p>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-stone-200 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/20 disabled:opacity-60"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            <LogOut aria-hidden="true" size={17} />
            {isLoggingOut ? 'Saindo...' : 'Sair'}
          </button>
        </header>

        <section className="my-auto py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">
            Visão geral
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Bem-vindo, {user?.name}.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-stone-300">
            Dashboard em construção.
          </p>
          <div className="mt-10 max-w-xl rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-sm leading-6 text-stone-400">
            Os indicadores da operação serão adicionados em uma próxima
            milestone.
          </div>
          <Link
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 font-semibold text-stone-950"
            to="/products"
          >
            <Package size={18} />
            Gerenciar produtos
          </Link>
        </section>
      </div>
    </main>
  );
}
