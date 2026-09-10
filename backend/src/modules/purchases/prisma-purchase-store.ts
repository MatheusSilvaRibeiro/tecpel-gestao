import { Prisma, type PrismaClient } from '@prisma/client';
import { AppError } from '../../errors/app-error.js';
import type {
  CreatePurchaseInput,
  PurchaseFilters,
  PurchaseStore,
} from './purchase-store.js';

const details = {
  createdBy: { select: { id: true, name: true } },
  items: {
    include: {
      product: {
        select: { id: true, name: true, brand: true, imageUrl: true },
      },
    },
    orderBy: { id: 'asc' as const },
  },
} as const;
type PurchaseRecord = Prisma.PurchaseGetPayload<{ include: typeof details }>;
const money = (value: Prisma.Decimal) => value.toDecimalPlaces(2).toFixed(2);
function mapPurchase(record: PurchaseRecord, includeItems = true) {
  return {
    id: record.id,
    supplierName: record.supplierName,
    invoiceNumber: record.invoiceNumber,
    purchaseDate: record.purchaseDate,
    totalAmount: money(record.totalAmount),
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    itemsCount: record.items.length,
    ...(includeItems
      ? {
          items: record.items.map((item) => ({
            id: item.id,
            product: item.product,
            quantity: item.quantity,
            unitCost: money(item.unitCost),
            subtotal: money(item.subtotal),
          })),
        }
      : {}),
  };
}

export class PrismaPurchaseStore implements PurchaseStore {
  constructor(private readonly prisma: PrismaClient) {}
  create(input: CreatePurchaseInput) {
    return this.prisma.$transaction(
      async (transaction) => {
        const products = await transaction.product.findMany({
          where: { id: { in: input.items.map((item) => item.productId) } },
          select: { id: true, active: true },
        });
        const byId = new Map(products.map((product) => [product.id, product]));
        const prepared = input.items.map((item) => {
          const product = byId.get(item.productId);
          if (!product)
            throw new AppError(
              404,
              'PRODUCT_NOT_FOUND',
              'Produto não encontrado.',
            );
          if (!product.active)
            throw new AppError(
              409,
              'PRODUCT_INACTIVE',
              'Produto inativo não pode receber compra.',
            );
          const unitCost = new Prisma.Decimal(item.unitCost);
          return {
            ...item,
            unitCost,
            subtotal: unitCost.mul(item.quantity).toDecimalPlaces(2),
          };
        });
        const totalAmount = prepared.reduce(
          (sum, item) => sum.add(item.subtotal),
          new Prisma.Decimal(0),
        );
        const purchase = await transaction.purchase.create({
          data: {
            supplierName: input.supplierName,
            invoiceNumber: input.invoiceNumber,
            purchaseDate: input.purchaseDate,
            totalAmount,
            createdById: input.createdById,
          },
        });
        for (const item of prepared) {
          const purchaseItem = await transaction.purchaseItem.create({
            data: {
              purchaseId: purchase.id,
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              subtotal: item.subtotal,
            },
          });
          await transaction.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'ENTRY',
              quantity: item.quantity,
              unitCost: item.unitCost,
              note: `Compra ${purchase.id}`,
              createdBy: input.createdById,
              purchaseItemId: purchaseItem.id,
            },
          });
        }
        return mapPurchase(
          await transaction.purchase.findUniqueOrThrow({
            where: { id: purchase.id },
            include: details,
          }),
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async list(filters: PurchaseFilters) {
    const records = await this.prisma.purchase.findMany({
      where: {
        supplierName: filters.supplier
          ? { contains: filters.supplier, mode: 'insensitive' }
          : undefined,
        purchaseDate:
          filters.startDate || filters.endDate
            ? { gte: filters.startDate, lte: filters.endDate }
            : undefined,
      },
      include: details,
      orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
    });
    return records.map((record) => mapPurchase(record, false));
  }
  async findById(id: string) {
    const record = await this.prisma.purchase.findUnique({
      where: { id },
      include: details,
    });
    return record ? mapPurchase(record) : null;
  }
  async getProductCost(productId: string) {
    const item = await this.prisma.purchaseItem.findFirst({
      where: { productId },
      include: {
        purchase: { select: { purchaseDate: true, createdAt: true } },
        product: { select: { salePrice: true } },
      },
      orderBy: [
        { purchase: { purchaseDate: 'desc' } },
        { purchase: { createdAt: 'desc' } },
      ],
    });
    if (!item) return null;
    const margin = item.product.salePrice.sub(item.unitCost).toDecimalPlaces(2);
    return {
      lastUnitCost: money(item.unitCost),
      lastPurchaseDate: item.purchase.purchaseDate,
      grossMarginValue: money(margin),
      grossMarginPercent: item.product.salePrice.isZero()
        ? '0.00'
        : margin
            .div(item.product.salePrice)
            .mul(100)
            .toDecimalPlaces(2)
            .toFixed(2),
    };
  }
}
