import type { UserRole } from '../auth/user-store.js';
import type {
  PurchaseReportFilters,
  ReportsRepository,
  SalesProductFilters,
  SalesReportFilters,
  StockReportFilters,
} from './reports-repository.js';

const csvCell = (value: unknown) =>
  `"${String(value ?? '')
    .replaceAll('"', '""')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')}"`;
const csv = (headers: string[], rows: unknown[][]) =>
  '\uFEFF' +
  [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
const dateBr = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);

export class ReportsService {
  constructor(private readonly repository: ReportsRepository) {}
  async sales(filters: SalesReportFilters, role: UserRole) {
    const result = await this.repository.sales(filters);
    if (role === 'ADMIN') return result;
    const { cost: _cost, profit: _profit, ...summary } = result.summary;
    void _cost;
    void _profit;
    return {
      summary,
      records: {
        ...result.records,
        data: result.records.data.map(
          ({ totalCost: _c, totalProfit: _p, ...row }) => {
            void _c;
            void _p;
            return row;
          },
        ),
      },
    };
  }
  async soldProducts(filters: SalesProductFilters, role: UserRole) {
    const result = await this.repository.soldProducts(filters);
    if (role === 'ADMIN') return result;
    return {
      ...result,
      data: result.data.map(({ cost: _c, profit: _p, ...row }) => {
        void _c;
        void _p;
        return row;
      }),
    };
  }
  paymentMethods(filters: SalesReportFilters) {
    return this.repository.paymentMethods(filters);
  }
  purchases(filters: PurchaseReportFilters) {
    return this.repository.purchases(filters);
  }
  purchasedProducts(filters: PurchaseReportFilters) {
    return this.repository.purchasedProducts(filters);
  }
  stockMovements(filters: StockReportFilters) {
    return this.repository.stockMovements(filters);
  }
  async salesCsv(filters: SalesReportFilters, role: UserRole) {
    const rows = [];
    let page = 1,
      totalPages = 1;
    do {
      const result = await this.repository.sales({
        ...filters,
        page,
        pageSize: 1000,
      });
      rows.push(...result.records.data);
      totalPages = result.records.meta.totalPages;
      page += 1;
    } while (page <= totalPages);
    const admin = role === 'ADMIN';
    return csv(
      [
        'Data',
        'Vendedor',
        'Forma de pagamento',
        'Itens',
        'Total',
        ...(admin ? ['Custo', 'Lucro'] : []),
      ],
      rows.map((r) => [
        dateBr(r.createdAt),
        r.seller.name,
        r.paymentMethod,
        r.itemsCount,
        r.totalAmount,
        ...(admin ? [r.totalCost, r.totalProfit] : []),
      ]),
    );
  }
  async purchasesCsv(filters: PurchaseReportFilters) {
    const rows = [];
    let page = 1,
      totalPages = 1;
    do {
      const result = await this.repository.purchases({
        ...filters,
        page,
        pageSize: 1000,
      });
      rows.push(...result.records.data);
      totalPages = result.records.meta.totalPages;
      page += 1;
    } while (page <= totalPages);
    return csv(
      ['Data', 'Fornecedor', 'Nota', 'Itens', 'Total', 'Responsável'],
      rows.map((r) => [
        dateBr(r.purchaseDate),
        r.supplierName ?? '',
        r.invoiceNumber ?? '',
        r.itemsCount,
        r.totalAmount,
        r.createdBy.name,
      ]),
    );
  }
  async stockCsv(filters: StockReportFilters) {
    const rows = [];
    let page = 1,
      totalPages = 1;
    do {
      const result = await this.repository.stockMovements({
        ...filters,
        page,
        pageSize: 1000,
      });
      rows.push(...result.data);
      totalPages = result.meta.totalPages;
      page += 1;
    } while (page <= totalPages);
    return csv(
      [
        'Data',
        'Produto',
        'Tipo',
        'Quantidade',
        'Responsável',
        'Observação',
        'Compra',
      ],
      rows.map((r) => [
        dateBr(r.createdAt),
        r.product.name,
        r.type,
        r.quantity,
        r.user.name,
        r.note ?? '',
        r.purchaseId ?? '',
      ]),
    );
  }
}
