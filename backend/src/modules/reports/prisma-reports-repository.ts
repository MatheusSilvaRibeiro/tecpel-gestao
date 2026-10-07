import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  PaymentMethodRow,
  PurchaseReportFilters,
  ReportPeriod,
  ReportsRepository,
  SaleReportRow,
  SalesProductFilters,
  SalesReportFilters,
  StockMovementReportRow,
  StockReportFilters,
} from './reports-repository.js';

type CountRow = { total: bigint };
type SalesSummaryRow = {
  salesCount: bigint;
  revenue: Prisma.Decimal;
  cost: Prisma.Decimal;
  profit: Prisma.Decimal;
};
type SaleSql = Omit<
  SaleReportRow,
  'seller' | 'itemsCount' | 'totalAmount' | 'totalCost' | 'totalProfit'
> & {
  sellerId: string;
  sellerName: string;
  itemsCount: bigint;
  totalAmount: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  totalProfit: Prisma.Decimal;
};
type SoldSql = {
  id: string;
  name: string;
  brand: string | null;
  quantitySold: bigint;
  revenue: Prisma.Decimal;
  cost: Prisma.Decimal;
  profit: Prisma.Decimal;
};
type PaymentSql = {
  paymentMethod: PaymentMethodRow['paymentMethod'];
  salesCount: bigint;
  totalAmount: Prisma.Decimal;
};
type PurchaseSummary = {
  purchasesCount: bigint;
  totalPurchased: Prisma.Decimal;
};
type PurchaseSql = {
  id: string;
  purchaseDate: Date;
  supplierName: string | null;
  invoiceNumber: string | null;
  itemsCount: bigint;
  totalAmount: Prisma.Decimal;
  userId: string;
  userName: string;
};
type PurchasedSql = {
  id: string;
  name: string;
  brand: string | null;
  quantityPurchased: bigint;
  totalPurchased: Prisma.Decimal;
  averageUnitCost: Prisma.Decimal;
};
type MovementSql = {
  id: string;
  createdAt: Date;
  productId: string;
  productName: string;
  type: StockMovementReportRow['type'];
  quantity: number;
  userId: string;
  userName: string;
  note: string | null;
  purchaseId: string | null;
};
const money = (v: Prisma.Decimal) => v.toDecimalPlaces(2).toFixed(2);
const paged = <T>(
  data: T[],
  total: number,
  f: { page: number; pageSize: number },
) => ({
  data,
  meta: {
    page: f.page,
    pageSize: f.pageSize,
    total,
    totalPages: Math.ceil(total / f.pageSize),
  },
});
const localDate = (column: Prisma.Sql, p: ReportPeriod) =>
  Prisma.sql`(${column} AT TIME ZONE 'UTC' AT TIME ZONE ${p.timezone})::date BETWEEN ${p.startDate}::date AND ${p.endDate}::date`;

export class PrismaReportsRepository implements ReportsRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async sales(f: SalesReportFilters) {
    const date = localDate(Prisma.raw('sale."createdAt"'), f);
    const extra = Prisma.sql`${f.paymentMethod ? Prisma.sql`AND sale."paymentMethod"=${f.paymentMethod}::"PaymentMethod"` : Prisma.empty} ${f.sellerId ? Prisma.sql`AND sale."soldById"=${f.sellerId}` : Prisma.empty}`;
    const [sum, rows, count] = await this.prisma.$transaction([
      this.prisma.$queryRaw<SalesSummaryRow[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS "salesCount",COALESCE(SUM(sale."totalAmount"),0)::decimal AS revenue,COALESCE(SUM(sale."totalCost"),0)::decimal AS cost,COALESCE(SUM(sale."totalProfit"),0)::decimal AS profit FROM "Sale" sale WHERE ${date} ${extra}`,
      ),
      this.prisma.$queryRaw<SaleSql[]>(
        Prisma.sql`SELECT sale.id,sale."createdAt",sale."paymentMethod",sale."soldById" AS "sellerId",usr.name AS "sellerName",COALESCE(SUM(item.quantity),0)::bigint AS "itemsCount",sale."totalAmount",sale."totalCost",sale."totalProfit" FROM "Sale" sale JOIN "User" usr ON usr.id=sale."soldById" LEFT JOIN "SaleItem" item ON item."saleId"=sale.id WHERE ${date} ${extra} GROUP BY sale.id,usr.id ORDER BY sale."createdAt" DESC,sale.id DESC OFFSET ${(f.page - 1) * f.pageSize} LIMIT ${f.pageSize}`,
      ),
      this.prisma.$queryRaw<CountRow[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "Sale" sale WHERE ${date} ${extra}`,
      ),
    ]);
    const s = sum[0]!,
      n = Number(s.salesCount);
    return {
      summary: {
        salesCount: n,
        revenue: money(s.revenue),
        cost: money(s.cost),
        profit: money(s.profit),
        averageTicket: n ? money(s.revenue.div(n)) : '0.00',
      },
      records: paged(
        rows.map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          seller: { id: r.sellerId, name: r.sellerName },
          paymentMethod: r.paymentMethod,
          itemsCount: Number(r.itemsCount),
          totalAmount: money(r.totalAmount),
          totalCost: money(r.totalCost),
          totalProfit: money(r.totalProfit),
        })),
        Number(count[0]!.total),
        f,
      ),
    };
  }
  async soldProducts(f: SalesProductFilters) {
    const date = localDate(Prisma.raw('sale."createdAt"'), f),
      extra = Prisma.sql`${f.paymentMethod ? Prisma.sql`AND sale."paymentMethod"=${f.paymentMethod}::"PaymentMethod"` : Prisma.empty} ${f.sellerId ? Prisma.sql`AND sale."soldById"=${f.sellerId}` : Prisma.empty}`,
      order =
        f.orderBy === 'profit'
          ? Prisma.sql`profit DESC`
          : f.orderBy === 'revenue'
            ? Prisma.sql`revenue DESC`
            : Prisma.sql`"quantitySold" DESC`;
    const base = Prisma.sql`FROM "SaleItem" item JOIN "Sale" sale ON sale.id=item."saleId" JOIN "Product" product ON product.id=item."productId" WHERE ${date} ${extra} GROUP BY product.id`;
    const [rows, count] = await this.prisma.$transaction([
      this.prisma.$queryRaw<SoldSql[]>(
        Prisma.sql`SELECT product.id,product.name,product.brand,SUM(item.quantity)::bigint AS "quantitySold",SUM(item.subtotal)::decimal AS revenue,SUM(item."unitCost"*item.quantity)::decimal AS cost,SUM(item.profit)::decimal AS profit ${base} ORDER BY ${order},product.name OFFSET ${(f.page - 1) * f.pageSize} LIMIT ${f.pageSize}`,
      ),
      this.prisma.$queryRaw<CountRow[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total FROM (SELECT product.id ${base}) grouped`,
      ),
    ]);
    return paged(
      rows.map((r) => ({
        product: { id: r.id, name: r.name, brand: r.brand },
        quantitySold: Number(r.quantitySold),
        revenue: money(r.revenue),
        cost: money(r.cost),
        profit: money(r.profit),
      })),
      Number(count[0]!.total),
      f,
    );
  }
  async paymentMethods(p: ReportPeriod) {
    const date = localDate(Prisma.raw('sale."createdAt"'), p);
    const rows = await this.prisma.$queryRaw<PaymentSql[]>(
      Prisma.sql`SELECT sale."paymentMethod",COUNT(*)::bigint AS "salesCount",SUM(sale."totalAmount")::decimal AS "totalAmount" FROM "Sale" sale WHERE ${date} GROUP BY sale."paymentMethod" ORDER BY "totalAmount" DESC`,
    );
    return rows.map((r) => ({
      paymentMethod: r.paymentMethod,
      salesCount: Number(r.salesCount),
      totalAmount: money(r.totalAmount),
    }));
  }
  async purchases(f: PurchaseReportFilters) {
    const date = localDate(Prisma.raw('purchase."purchaseDate"'), f),
      extra = f.supplier
        ? Prisma.sql`AND purchase."supplierName" ILIKE ${`%${f.supplier}%`}`
        : Prisma.empty;
    const [sum, rows, count] = await this.prisma.$transaction([
      this.prisma.$queryRaw<PurchaseSummary[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS "purchasesCount",COALESCE(SUM(purchase."totalAmount"),0)::decimal AS "totalPurchased" FROM "Purchase" purchase WHERE ${date} ${extra}`,
      ),
      this.prisma.$queryRaw<PurchaseSql[]>(
        Prisma.sql`SELECT purchase.id,purchase."purchaseDate",purchase."supplierName",purchase."invoiceNumber",purchase."totalAmount",purchase."createdById" AS "userId",usr.name AS "userName",COALESCE(SUM(item.quantity),0)::bigint AS "itemsCount" FROM "Purchase" purchase JOIN "User" usr ON usr.id=purchase."createdById" LEFT JOIN "PurchaseItem" item ON item."purchaseId"=purchase.id WHERE ${date} ${extra} GROUP BY purchase.id,usr.id ORDER BY purchase."purchaseDate" DESC,purchase.id DESC OFFSET ${(f.page - 1) * f.pageSize} LIMIT ${f.pageSize}`,
      ),
      this.prisma.$queryRaw<CountRow[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "Purchase" purchase WHERE ${date} ${extra}`,
      ),
    ]);
    const s = sum[0]!;
    return {
      summary: {
        purchasesCount: Number(s.purchasesCount),
        totalPurchased: money(s.totalPurchased),
      },
      records: paged(
        rows.map((r) => ({
          id: r.id,
          purchaseDate: r.purchaseDate,
          supplierName: r.supplierName,
          invoiceNumber: r.invoiceNumber,
          itemsCount: Number(r.itemsCount),
          totalAmount: money(r.totalAmount),
          createdBy: { id: r.userId, name: r.userName },
        })),
        Number(count[0]!.total),
        f,
      ),
    };
  }
  async purchasedProducts(f: PurchaseReportFilters) {
    const date = localDate(Prisma.raw('purchase."purchaseDate"'), f),
      extra = f.supplier
        ? Prisma.sql`AND purchase."supplierName" ILIKE ${`%${f.supplier}%`}`
        : Prisma.empty,
      base = Prisma.sql`FROM "PurchaseItem" item JOIN "Purchase" purchase ON purchase.id=item."purchaseId" JOIN "Product" product ON product.id=item."productId" WHERE ${date} ${extra} GROUP BY product.id`;
    const [rows, count] = await this.prisma.$transaction([
      this.prisma.$queryRaw<PurchasedSql[]>(
        Prisma.sql`SELECT product.id,product.name,product.brand,SUM(item.quantity)::bigint AS "quantityPurchased",SUM(item.subtotal)::decimal AS "totalPurchased",(SUM(item.subtotal)/NULLIF(SUM(item.quantity),0))::decimal AS "averageUnitCost" ${base} ORDER BY "quantityPurchased" DESC,product.name OFFSET ${(f.page - 1) * f.pageSize} LIMIT ${f.pageSize}`,
      ),
      this.prisma.$queryRaw<CountRow[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total FROM (SELECT product.id ${base}) grouped`,
      ),
    ]);
    return paged(
      rows.map((r) => ({
        product: { id: r.id, name: r.name, brand: r.brand },
        quantityPurchased: Number(r.quantityPurchased),
        totalPurchased: money(r.totalPurchased),
        averageUnitCost: money(r.averageUnitCost),
      })),
      Number(count[0]!.total),
      f,
    );
  }
  async stockMovements(f: StockReportFilters) {
    const date = localDate(Prisma.raw('movement."createdAt"'), f),
      extra = Prisma.sql`${f.productId ? Prisma.sql`AND movement."productId"=${f.productId}` : Prisma.empty} ${f.movementType ? Prisma.sql`AND movement.type=${f.movementType}::"StockMovementType"` : Prisma.empty}`;
    const [rows, count] = await this.prisma.$transaction([
      this.prisma.$queryRaw<MovementSql[]>(
        Prisma.sql`SELECT movement.id,movement."createdAt",movement.type,movement.quantity,movement.note,movement."productId",product.name AS "productName",movement."createdBy" AS "userId",usr.name AS "userName",item."purchaseId" FROM "StockMovement" movement JOIN "Product" product ON product.id=movement."productId" JOIN "User" usr ON usr.id=movement."createdBy" LEFT JOIN "PurchaseItem" item ON item.id=movement."purchaseItemId" WHERE ${date} ${extra} ORDER BY movement."createdAt" DESC,movement.id DESC OFFSET ${(f.page - 1) * f.pageSize} LIMIT ${f.pageSize}`,
      ),
      this.prisma.$queryRaw<CountRow[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "StockMovement" movement WHERE ${date} ${extra}`,
      ),
    ]);
    return paged(
      rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        product: { id: r.productId, name: r.productName },
        type: r.type,
        quantity: r.quantity,
        user: { id: r.userId, name: r.userName },
        note: r.note,
        purchaseId: r.purchaseId,
      })),
      Number(count[0]!.total),
      f,
    );
  }
}
