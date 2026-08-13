const futureModules = [
  'Produtos',
  'Estoque',
  'Vendas',
  'Lucro real',
  'Dashboard',
  'Histórico',
];

export function HomePage() {
  return (
    <main className="min-h-screen bg-stone-950 px-5 py-10 text-stone-100 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-between rounded-3xl border border-white/10 bg-stone-900 p-7 shadow-2xl sm:p-10 lg:p-14">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-amber-300 font-black text-stone-950">
              TP
            </span>
            <div>
              <p className="font-semibold">TecPel Gestão</p>
              <p className="text-sm text-stone-400">Base do sistema</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Sprint 0
          </span>
        </header>

        <section className="my-16 max-w-3xl lg:my-24">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">
            Perfumes e cremes
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Uma base sólida para gerir cada venda.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-300">
            O ambiente inicial está pronto. Os módulos de negócio serão
            construídos nas próximas sprints, com foco em clareza, agilidade e
            resultados reais.
          </p>
        </section>

        <section aria-label="Módulos planejados">
          <p className="mb-4 text-sm text-stone-400">
            Módulos planejados para o MVP
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {futureModules.map((module) => (
              <li
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm font-medium text-stone-300"
                key={module}
              >
                {module}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
