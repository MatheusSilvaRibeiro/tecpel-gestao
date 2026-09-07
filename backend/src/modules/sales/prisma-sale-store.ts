import { Prisma, type PrismaClient } from '@prisma/client';

import { AppError } from '../../errors/app-error.js';
import type {
  CreateSaleInput,
  Sale,
  SaleFilters,
  SaleStore,
} from './sale-store.js';

const saleInclude = {
  soldBy: { select: { id: true, name: true } },
  items: {
    include: { product: { select: { id: true, name: true } } },
    orderBy: { id: 'asc' as const },
  },
} as const;

type SaleRecord = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;

function money(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2);
}

function mapSale(record: SaleRecord, includeItems = true): Sale {
  return {
    id: record.id,
    soldBy: record.soldBy,
    paymentMethod: record.paymentMethod,
    totalAmount: money(record.totalAmount),
    totalCost: money(record.totalCost),
    totalProfit: money(record.totalProfit),
    createdAt: record.createdAt,
    ...(includeItems
      ? {
          items: record.items.map((item) => ({
            id: item.id,
            product: item.product,
            quantity: item.quantity,
            unitPrice: money(item.unitPrice),
            unitCost: money(item.unitCost),
            subtotal: money(item.subtotal),
            profit: money(item.profit),
          })),
        }
      : {}),
  };
}

function inventoryState(
  movements: {
    type: string;
    quantity: number;
    unitCost: Prisma.Decimal | null;
  }[],
) {
  let quantity = 0;
  let value = new Prisma.Decimal(0);
  for (const movement of movements) {
    const average = quantity > 0 ? value.div(quantity) : new Prisma.Decimal(0);
    if (movement.type === 'ENTRY' && movement.unitCost) {
      quantity += movement.quantity;
      value = value.add(movement.unitCost.mul(movement.quantity));
    } else if (movement.type === 'SALE') {
      quantity += movement.quantity;
      value = value.add((movement.unitCost ?? average).mul(movement.quantity));
    } else {
      quantity += movement.quantity;
      value = value.add(average.mul(movement.quantity));
    }
  }
  return {
    quantity,
    averageCost:
      quantity > 0
        ? value.div(quantity).toDecimalPlaces(2)
        : new Prisma.Decimal(0),
  };
}

export class PrismaSaleStore implements SaleStore {
  constructor(private readonly prisma: PrismaClient) {}

  create(input: CreateSaleInput) {
    return this.prisma.$transaction(
      async (transaction) => {
        const productIds = input.items.map((item) => item.productId);
        const products = await transaction.product.findMany({
          where: { id: { in: productIds } },
          include: {
            stockMovements: {
              select: { type: true, quantity: true, unitCost: true },
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            },
          },
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
              'Produto inativo não pode ser vendido.',
            );
          const stock = inventoryState(product.stockMovements);
          if (item.quantity > stock.quantity)
            throw new AppError(
              409,
              'INSUFFICIENT_STOCK',
              `Estoque insuficiente. Disponível: ${stock.quantity} unidades.`,
            );
          const unitPrice =
            input.role === 'ADMIN' && item.unitPrice
              ? new Prisma.Decimal(item.unitPrice)
              : product.salePrice;
          const subtotal = unitPrice.mul(item.quantity).toDecimalPlaces(2);
          const cost = stock.averageCost.mul(item.quantity).toDecimalPlaces(2);
          return {
            item,
            product,
            unitPrice,
            unitCost: stock.averageCost,
            subtotal,
            cost,
            profit: subtotal.sub(cost),
          };
        });
        const totalAmount = prepared.reduce(
          (sum, item) => sum.add(item.subtotal),
          new Prisma.Decimal(0),
        );
        const totalCost = prepared.reduce(
          (sum, item) => sum.add(item.cost),
          new Prisma.Decimal(0),
        );
        const sale = await transaction.sale.create({
          data: {
            soldById: input.soldById,
            paymentMethod: input.paymentMethod,
            totalAmount,
            totalCost,
            totalProfit: totalAmount.sub(totalCost),
          },
        });
        await transaction.saleItem.createMany({
          data: prepared.map(
            ({ item, unitPrice, unitCost, subtotal, profit }) => ({
              saleId: sale.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice,
              unitCost,
              subtotal,
              profit,
            }),
          ),
        });
        await transaction.stockMovement.createMany({
          data: prepared.map(({ item, unitCost }) => ({
            productId: item.productId,
            type: 'SALE',
            quantity: -item.quantity,
            unitCost,
            note: `Venda ${sale.id}`,
            createdBy: input.soldById,
          })),
        });
        const complete = await transaction.sale.findUniqueOrThrow({
          where: { id: sale.id },
          include: saleInclude,
        });
        return mapSale(complete);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async list(filters: SaleFilters) {
    const records = await this.prisma.sale.findMany({
      where: {
        soldById: filters.soldById,
        paymentMethod: filters.paymentMethod,
        createdAt:
          filters.from || filters.to
            ? { gte: filters.from, lte: filters.to }
            : undefined,
      },
      include: saleInclude,
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => mapSale(record, false));
  }

  async findById(id: string) {
    const record = await this.prisma.sale.findUnique({
      where: { id },
      include: saleInclude,
    });
    return record ? mapSale(record) : null;
  }
}
