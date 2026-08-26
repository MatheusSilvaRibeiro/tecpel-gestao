export function SessionLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-950 px-6 text-stone-100">
      <div
        className="flex items-center gap-3 text-sm text-stone-300"
        role="status"
      >
        <span className="size-4 animate-spin rounded-full border-2 border-amber-300 border-r-transparent" />
        Verificando sessão...
      </div>
    </main>
  );
}
