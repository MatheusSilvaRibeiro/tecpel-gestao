import { Prisma, type PrismaClient } from '@prisma/client';
import type { AnalyticsRepository } from './analytics-repository.js';

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  profit: Prisma.Decimal;
  revenue: Prisma.Decimal;
  quantitySold: bigint;
};
type BrandRow = {
  brand: string;
  profit: Prisma.Decimal;
  revenue: Prisma.Decimal;
  quantitySold: bigint;
};
type StaleRow = {
  id: string;
  name: string;
  currentStock: bigint;
  lastUnitCost: Prisma.Decimal | null;
  tiedCapital: Prisma.Decimal | null;
  lastSaleAt: Date | null;
  daysWithoutSale: number | null;
};
type StockRow = { id: string; name: string; currentStock: bigint };
type TotalRow = {
  investedCapital: Prisma.Decimal;
  profit: Prisma.Decimal;
  revenue: Prisma.Decimal;
};
type EvolutionRow = {
  date: Date;
  revenue: Prisma.Decimal;
  profit: Prisma.Decimal;
};
type ProductAnalyticsRow = {
  quantitySold: bigint;
  accumulatedProfit: Prisma.Decimal;
  lastSaleAt: Date | null;
  lastPurchaseAt: Date | null;
};
const money = (value: Prisma.Decimal) => value.toDecimalPlaces(2).toFixed(2);
const productMap = (row: ProductRow) => ({
  product: { id: row.id, name: row.name, brand: row.brand },
  profit: money(row.profit),
  revenue: money(row.revenue),
  quantitySold: Number(row.quantitySold),
});
export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async getAnalytics(now: Date, timezone: string) {
    const performance = Prisma.sql`SELECT product.id, product.name, product.brand, COALESCE(SUM(item.profit), 0)::decimal AS profit, COALESCE(SUM(item.subtotal), 0)::decimal AS revenue, COALESCE(SUM(item.quantity), 0)::bigint AS "quantitySold" FROM "Product" product JOIN "SaleItem" item ON item."productId" = product.id GROUP BY product.id`;
    const stock = Prisma.sql`SELECT product.id, product.name, COALESCE(SUM(movement.quantity), 0)::bigint AS "currentStock" FROM "Product" product LEFT JOIN "StockMovement" movement ON movement."productId" = product.id WHERE product.active = true GROUP BY product.id`;
    const [
      mostRows,
      leastRows,
      brandRows,
      staleRows,
      totalRows,
      stockRows,
      evolutionRows,
    ] = await this.prisma.$transaction([
      this.prisma.$queryRaw<ProductRow[]>(
        Prisma.sql`${performance} ORDER BY profit DESC, revenue DESC LIMIT 10`,
      ),
      this.prisma.$queryRaw<ProductRow[]>(
        Prisma.sql`${performance} ORDER BY profit ASC, revenue ASC LIMIT 10`,
      ),
      this.prisma.$queryRaw<BrandRow[]>(
        Prisma.sql`SELECT COALESCE(product.brand, 'Sem marca') AS brand, SUM(item.profit)::decimal AS profit, SUM(item.subtotal)::decimal AS revenue, SUM(item.quantity)::bigint AS "quantitySold" FROM "SaleItem" item JOIN "Product" product ON product.id = item."productId" GROUP BY COALESCE(product.brand, 'Sem marca') ORDER BY profit DESC LIMIT 10`,
      ),
      this.prisma.$queryRaw<StaleRow[]>(
        Prisma.sql`WITH stocks AS (${stock}) SELECT stocks.id, stocks.name, stocks."currentStock", cost."unitCost" AS "lastUnitCost", CASE WHEN cost."unitCost" IS NULL THEN NULL ELSE stocks."currentStock" * cost."unitCost" END::decimal AS "tiedCapital", sales."lastSaleAt", CASE WHEN sales."lastSaleAt" IS NULL THEN NULL ELSE ((${now}::timestamptz AT TIME ZONE ${timezone})::date - (sales."lastSaleAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date)::integer END AS "daysWithoutSale" FROM stocks LEFT JOIN LATERAL (SELECT item."unitCost" FROM "PurchaseItem" item JOIN "Purchase" purchase ON purchase.id = item."purchaseId" WHERE item."productId" = stocks.id ORDER BY purchase."purchaseDate" DESC, purchase."createdAt" DESC LIMIT 1) cost ON true LEFT JOIN LATERAL (SELECT MAX(sale."createdAt") AS "lastSaleAt" FROM "SaleItem" item JOIN "Sale" sale ON sale.id = item."saleId" WHERE item."productId" = stocks.id) sales ON true WHERE sales."lastSaleAt" IS NULL OR sales."lastSaleAt" < ${now}::timestamptz - interval '90 days' ORDER BY "daysWithoutSale" DESC NULLS FIRST, stocks.name`,
      ),
      this.prisma.$queryRaw<TotalRow[]>(
        Prisma.sql`WITH stocks AS (${stock}), costs AS (SELECT DISTINCT ON (item."productId") item."productId", item."unitCost" FROM "PurchaseItem" item JOIN "Purchase" purchase ON purchase.id = item."purchaseId" ORDER BY item."productId", purchase."purchaseDate" DESC, purchase."createdAt" DESC), sales AS (SELECT COALESCE(SUM("totalProfit"), 0)::decimal AS profit, COALESCE(SUM("totalAmount"), 0)::decimal AS revenue FROM "Sale") SELECT COALESCE((SELECT SUM(stocks."currentStock" * costs."unitCost") FROM stocks JOIN costs ON costs."productId" = stocks.id), 0)::decimal AS "investedCapital", sales.profit, sales.revenue FROM sales`,
      ),
      this.prisma.$queryRaw<StockRow[]>(
        Prisma.sql`WITH stocks AS (${stock}) SELECT * FROM stocks WHERE "currentStock" <= 5 ORDER BY "currentStock" ASC, name`,
      ),
      this.prisma.$queryRaw<EvolutionRow[]>(
        Prisma.sql`WITH days AS (SELECT generate_series(((${now}::timestamptz AT TIME ZONE ${timezone})::date - 29), ((${now}::timestamptz AT TIME ZONE ${timezone})::date), interval '1 day')::date AS date) SELECT days.date, COALESCE(SUM(sale."totalAmount"), 0)::decimal AS revenue, COALESCE(SUM(sale."totalProfit"), 0)::decimal AS profit FROM days LEFT JOIN "Sale" sale ON (sale."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date = days.date GROUP BY days.date ORDER BY days.date`,
      ),
    ]);
    const total = totalRows[0]!;
    const margin = total.revenue.isZero()
      ? new Prisma.Decimal(0)
      : total.profit.div(total.revenue).mul(100);
    const alerts = stockRows.map((row) => ({
      product: { id: row.id, name: row.name },
      currentStock: Number(row.currentStock),
    }));
    return {
      mostProfitableProducts: mostRows.map(productMap),
      leastProfitableProducts: leastRows.map(productMap),
      profitableBrands: brandRows.map((row) => ({
        brand: row.brand,
        profit: money(row.profit),
        revenue: money(row.revenue),
        quantitySold: Number(row.quantitySold),
      })),
      staleProducts: staleRows.map((row) => ({
        product: { id: row.id, name: row.name },
        currentStock: Number(row.currentStock),
        lastUnitCost: row.lastUnitCost ? money(row.lastUnitCost) : null,
        tiedCapital: row.tiedCapital ? money(row.tiedCapital) : null,
        lastSaleAt: row.lastSaleAt,
        daysWithoutSale: row.daysWithoutSale,
      })),
      investedCapital: money(total.investedCapital),
      averageMarginPercent: margin.toDecimalPlaces(2).toFixed(2),
      criticalStock: alerts,
      outOfStock: alerts.filter((item) => item.currentStock === 0),
      revenueEvolution: evolutionRows.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        value: money(row.revenue),
      })),
      profitEvolution: evolutionRows.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        value: money(row.profit),
      })),
    };
  }
  async getProductAnalytics(productId: string) {
    const rows = await this.prisma.$queryRaw<ProductAnalyticsRow[]>(
      Prisma.sql`SELECT COALESCE(SUM(item.quantity), 0)::bigint AS "quantitySold", COALESCE(SUM(item.profit), 0)::decimal AS "accumulatedProfit", MAX(sale."createdAt") AS "lastSaleAt", (SELECT purchase."purchaseDate" FROM "PurchaseItem" purchase_item JOIN "Purchase" purchase ON purchase.id = purchase_item."purchaseId" WHERE purchase_item."productId" = ${productId} ORDER BY purchase."purchaseDate" DESC, purchase."createdAt" DESC LIMIT 1) AS "lastPurchaseAt" FROM "SaleItem" item JOIN "Sale" sale ON sale.id = item."saleId" WHERE item."productId" = ${productId}`,
    );
    const row = rows[0]!;
    return {
      quantitySold: Number(row.quantitySold),
      accumulatedProfit: money(row.accumulatedProfit),
      lastSaleAt: row.lastSaleAt,
      lastPurchaseAt: row.lastPurchaseAt,
    };
  }
}
