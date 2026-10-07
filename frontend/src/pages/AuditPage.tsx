import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ProductShell,
  buttonClass,
  fieldClass,
} from '../components/products/ProductShell';
import { useAudit, useAuditDetail } from '../hooks/useAudit';
import type {
  AuditAction,
  AuditEntity,
  AuditEvent,
} from '../services/audit-api';

const actionLabels: Record<AuditAction, string> = {
  CREATE: 'Criou produto',
  UPDATE: 'Alterou produto',
  DEACTIVATE: 'Desativou produto',
  STOCK_ADJUSTMENT: 'Ajustou estoque',
  STOCK_ENTRY: 'Registrou entrada',
  SALE_CREATED: 'Registrou venda',
  PURCHASE_CREATED: 'Registrou compra',
};
const entityLabels: Record<AuditEntity, string> = {
  PRODUCT: 'Produto',
  STOCK: 'Estoque',
  SALE: 'Venda',
  PURCHASE: 'Compra',
};
const fieldLabels: Record<string, string> = {
  name: 'Nome',
  brand: 'Marca',
  description: 'Descrição',
  type: 'Tipo',
  salePrice: 'Preço',
  imageUrl: 'Imagem',
  active: 'Ativo',
};
const value = (item: unknown) =>
  item === null
    ? '—'
    : typeof item === 'boolean'
      ? item
        ? 'Sim'
        : 'Não'
      : String(item ?? '—');
function summary(event: AuditEvent) {
  if (event.action === 'UPDATE') {
    const key = Object.keys(event.after ?? {})[0];
    return key
      ? `${fieldLabels[key] ?? key}: ${value(event.before?.[key])} → ${value(event.after?.[key])}`
      : 'Dados atualizados';
  }
  if (event.action === 'STOCK_ADJUSTMENT' || event.action === 'STOCK_ENTRY')
    return `${value(event.metadata?.previousStock)} → ${value(event.metadata?.newStock)} (${Number(event.metadata?.quantity) > 0 ? '+' : ''}${value(event.metadata?.quantity)})`;
  if (event.action === 'SALE_CREATED' || event.action === 'PURCHASE_CREATED')
    return `Total: R$ ${value(event.metadata?.totalAmount).replace('.', ',')}`;
  return entityLabels[event.entity];
}

export function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const filters = {
    page: Number(searchParams.get('page') ?? 1),
    pageSize: 20,
    action: searchParams.get('action') ?? undefined,
    entity: searchParams.get('entity') ?? undefined,
    entityId: searchParams.get('entityId') ?? undefined,
    userId: searchParams.get('userId') ?? undefined,
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
  };
  const audit = useAudit(filters);
  const detail = useAuditDetail(selected);
  const update = (key: string, next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set(key, next);
    else params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };
  return (
    <ProductShell>
      <h1 className="text-3xl font-bold">Histórico de Atividades</h1>
      <p className="mt-2 text-stone-400">
        Alterações administrativas e operações relevantes do negócio.
      </p>
      {!filters.entityId && (
        <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 p-4 md:grid-cols-5">
          <select
            aria-label="Tipo de ação"
            className={fieldClass}
            value={filters.action ?? ''}
            onChange={(e) => update('action', e.target.value)}
          >
            <option value="">Todas as ações</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Entidade"
            className={fieldClass}
            value={filters.entity ?? ''}
            onChange={(e) => update('entity', e.target.value)}
          >
            <option value="">Todas as entidades</option>
            {Object.entries(entityLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            aria-label="Usuário"
            className={fieldClass}
            placeholder="ID do usuário"
            value={filters.userId ?? ''}
            onChange={(e) => update('userId', e.target.value)}
          />
          <input
            aria-label="Data inicial"
            className={fieldClass}
            type="date"
            value={filters.startDate ?? ''}
            onChange={(e) => update('startDate', e.target.value)}
          />
          <input
            aria-label="Data final"
            className={fieldClass}
            type="date"
            value={filters.endDate ?? ''}
            onChange={(e) => update('endDate', e.target.value)}
          />
        </div>
      )}
      {audit.isLoading && <p className="mt-6">Carregando histórico...</p>}
      {audit.isError && (
        <p role="alert" className="mt-6 text-red-300">
          Não foi possível carregar o histórico.
        </p>
      )}
      {audit.data?.data.length === 0 && (
        <p className="mt-6 text-stone-400">Nenhuma atividade encontrada.</p>
      )}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-sm text-stone-400">
            <tr>
              <th className="p-3">Data/hora</th>
              <th className="p-3">Usuário</th>
              <th className="p-3">Ação</th>
              <th className="p-3">Entidade</th>
              <th className="p-3">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {audit.data?.data.map((event) => (
              <tr
                key={event.id}
                className="cursor-pointer border-t border-white/10 hover:bg-white/[0.03]"
                onClick={() => setSelected(event.id)}
              >
                <td className="p-3">
                  {new Date(event.createdAt).toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                  })}
                </td>
                <td className="p-3">{event.user.name}</td>
                <td className="p-3">{actionLabels[event.action]}</td>
                <td className="p-3">{entityLabels[event.entity]}</td>
                <td className="p-3">{summary(event)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {audit.data && audit.data.meta.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <button
            className={buttonClass}
            disabled={audit.data.meta.page <= 1}
            onClick={() => update('page', String(audit.data!.meta.page - 1))}
          >
            Anterior
          </button>
          <span>
            Página {audit.data.meta.page} de {audit.data.meta.totalPages}
          </span>
          <button
            className={buttonClass}
            disabled={audit.data.meta.page >= audit.data.meta.totalPages}
            onClick={() => update('page', String(audit.data!.meta.page + 1))}
          >
            Próxima
          </button>
        </div>
      )}
      {selected && (
        <section className="mt-8 rounded-2xl border border-amber-300/20 p-5">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold">Detalhes da atividade</h2>
            <button onClick={() => setSelected(null)}>Fechar</button>
          </div>
          {detail.isLoading && <p>Carregando detalhes...</p>}
          {detail.data && (
            <>
              <p className="mt-3">
                {actionLabels[detail.data.action]} por {detail.data.user.name}
              </p>
              {detail.data.action === 'UPDATE' && (
                <table className="mt-4 w-full">
                  <thead>
                    <tr>
                      <th>Campo</th>
                      <th>Antes</th>
                      <th>Depois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(detail.data.after ?? {}).map((key) => (
                      <tr key={key}>
                        <td>{fieldLabels[key] ?? key}</td>
                        <td>{value(detail.data!.before?.[key])}</td>
                        <td>{value(detail.data!.after?.[key])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <dl className="mt-4 grid gap-2">
                {Object.entries(detail.data.metadata ?? {}).map(
                  ([key, item]) => (
                    <div key={key}>
                      <dt className="text-sm text-stone-500">
                        {fieldLabels[key] ?? key}
                      </dt>
                      <dd>{value(item)}</dd>
                    </div>
                  ),
                )}
              </dl>
            </>
          )}
        </section>
      )}
    </ProductShell>
  );
}
