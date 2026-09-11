import { Prisma, type PrismaClient } from '@prisma/client';
import { LOW_STOCK_THRESHOLD, type DashboardStore } from './dashboard-store.js';

type TodayRow = {
  revenue: Prisma.Decimal;
  cost: Prisma.Decimal;
  profit: Prisma.Decimal;
  salesCount: bigint;
};
type StockRow = {
  activeProducts: bigint;
  outOfStock: bigint;
  lowStock: bigint;
};
type RecentRow = {
  id: string;
  createdAt: Date;
  soldById: string;
  soldByName: string;
  units: bigint;
  totalAmount: Prisma.Decimal;
  paymentMethod: 'CASH' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'OTHER';
  totalProfit: Prisma.Decimal;
};
type RevenueRow = { date: Date; revenue: Prisma.Decimal };
type PurchasesRow = { total: Prisma.Decimal };
const money = (value: Prisma.Decimal) => value.toDecimalPlaces(2).toFixed(2);

export class PrismaDashboardStore implements DashboardStore {
  constructor(private readonly prisma: PrismaClient) {}
  async read(now: Date, timezone: string) {
    const [todayRows, stockRows, recentRows, revenueRows, purchasesRows] =
      await this.prisma.$transaction([
        this.prisma.$queryRaw<TodayRow[]>(Prisma.sql`
        SELECT COALESCE(SUM("totalAmount"), 0)::decimal AS revenue,
          COALESCE(SUM("totalCost"), 0)::decimal AS cost,
          COALESCE(SUM("totalProfit"), 0)::decimal AS profit,
          COUNT(*)::bigint AS "salesCount"
        FROM "Sale"
        WHERE ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date = (${now}::timestamptz AT TIME ZONE ${timezone})::date
      `),
        this.prisma.$queryRaw<StockRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS "activeProducts",
          COUNT(*) FILTER (WHERE COALESCE(stock.quantity, 0) = 0)::bigint AS "outOfStock",
          COUNT(*) FILTER (WHERE COALESCE(stock.quantity, 0) > 0 AND COALESCE(stock.quantity, 0) <= ${LOW_STOCK_THRESHOLD})::bigint AS "lowStock"
        FROM "Product" product
        LEFT JOIN (SELECT "productId", SUM(quantity)::integer AS quantity FROM "StockMovement" GROUP BY "productId") stock
          ON stock."productId" = product.id
        WHERE product.active = true
      `),
        this.prisma.$queryRaw<RecentRow[]>(Prisma.sql`
        SELECT sale.id, sale."createdAt", sale."soldById", users.name AS "soldByName",
          COALESCE(SUM(items.quantity), 0)::bigint AS units, sale."totalAmount", sale."paymentMethod", sale."totalProfit"
        FROM "Sale" sale JOIN "User" users ON users.id = sale."soldById"
        LEFT JOIN "SaleItem" items ON items."saleId" = sale.id
        GROUP BY sale.id, users.id ORDER BY sale."createdAt" DESC LIMIT 5
      `),
        this.prisma.$queryRaw<RevenueRow[]>(Prisma.sql`
        WITH days AS (
          SELECT generate_series(((${now}::timestamptz AT TIME ZONE ${timezone})::date - 6),
            ((${now}::timestamptz AT TIME ZONE ${timezone})::date), interval '1 day')::date AS date
        )
        SELECT days.date, COALESCE(SUM(sale."totalAmount"), 0)::decimal AS revenue
        FROM days LEFT JOIN "Sale" sale ON (sale."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date = days.date
        GROUP BY days.date ORDER BY days.date
      `),
        this.prisma.$queryRaw<PurchasesRow[]>(Prisma.sql`
        SELECT COALESCE(SUM("totalAmount"), 0)::decimal AS total
        FROM "Purchase"
        WHERE date_trunc('month', "purchaseDate") = date_trunc('month', (${now}::timestamptz AT TIME ZONE ${timezone}))
      `),
      ]);
    const today = todayRows[0]!;
    const count = Number(today.salesCount);
    const stock = stockRows[0]!;
    return {
      today: {
        revenue: money(today.revenue),
        cost: money(today.cost),
        profit: money(today.profit),
        salesCount: count,
        averageTicket: count ? money(today.revenue.div(count)) : '0.00',
      },
      stock: {
        activeProducts: Number(stock.activeProducts),
        outOfStock: Number(stock.outOfStock),
        lowStock: Number(stock.lowStock),
      },
      recentSales: recentRows.map((sale) => ({
        id: sale.id,
        createdAt: sale.createdAt,
        soldBy: { id: sale.soldById, name: sale.soldByName },
        units: Number(sale.units),
        totalAmount: money(sale.totalAmount),
        paymentMethod: sale.paymentMethod,
        totalProfit: money(sale.totalProfit),
      })),
      revenueLast7Days: revenueRows.map((day) => ({
        date: day.date.toISOString().slice(0, 10),
        revenue: money(day.revenue),
      })),
      purchasesMonth: money(purchasesRows[0]!.total),
    };
  }
}
