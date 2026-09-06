import {
  Prisma,
  type PrismaClient,
  ProductType,
  StockMovementType,
} from '@prisma/client';

import { AppError } from '../../errors/app-error.js';
import type {
  MovementInput,
  ProductFilters,
  ProductInput,
  ProductStore,
} from './product-store.js';

const withMovements = {
  stockMovements: { select: { quantity: true } },
} as const;

function mapProduct(product: {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  type: ProductType;
  salePrice: Prisma.Decimal;
  imageUrl: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  stockMovements?: { quantity: number }[];
}) {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    description: product.description,
    type: product.type,
    salePrice: product.salePrice.toFixed(2),
    imageUrl: product.imageUrl,
    active: product.active,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    currentStock:
      product.stockMovements?.reduce((sum, item) => sum + item.quantity, 0) ??
      0,
  };
}

export class PrismaProductStore implements ProductStore {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: ProductInput) {
    const product = await this.prisma.product.create({
      data: {
        ...input,
        type: input.type as ProductType,
        salePrice: new Prisma.Decimal(input.salePrice),
      },
      include: withMovements,
    });
    return mapProduct(product);
  }

  async list(filters: ProductFilters) {
    const products = await this.prisma.product.findMany({
      where: {
        name: filters.search
          ? { contains: filters.search, mode: 'insensitive' }
          : undefined,
        type: filters.type as ProductType | undefined,
        active: filters.active,
      },
      include: withMovements,
      orderBy: { name: 'asc' },
    });
    return products.map(mapProduct);
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: withMovements,
    });
    return product ? mapProduct(product) : null;
  }

  async update(id: string, input: Partial<ProductInput>) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return null;
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...input,
        type: input.type as ProductType | undefined,
        salePrice: input.salePrice
          ? new Prisma.Decimal(input.salePrice)
          : undefined,
      },
      include: withMovements,
    });
    return mapProduct(product);
  }

  async deactivate(id: string) {
    const result = await this.prisma.product.updateMany({
      where: { id },
      data: { active: false },
    });
    return result.count > 0;
  }

  registerMovement(input: MovementInput) {
    return this.prisma.$transaction(
      async (transaction) => {
        const product = await transaction.product.findUnique({
          where: { id: input.productId },
          select: { active: true },
        });
        if (!product)
          throw new AppError(
            404,
            'PRODUCT_NOT_FOUND',
            'Produto não encontrado.',
          );
        if (!product.active) {
          throw new AppError(
            409,
            'PRODUCT_INACTIVE',
            'Produto inativo não pode movimentar estoque.',
          );
        }
        const aggregate = await transaction.stockMovement.aggregate({
          where: { productId: input.productId },
          _sum: { quantity: true },
        });
        const currentStock = aggregate._sum.quantity ?? 0;
        if (currentStock + input.quantity < 0) {
          throw new AppError(
            409,
            'INSUFFICIENT_STOCK',
            'O ajuste deixaria o estoque negativo.',
          );
        }
        const movement = await transaction.stockMovement.create({
          data: {
            productId: input.productId,
            type: input.type as StockMovementType,
            quantity: input.quantity,
            unitCost: input.unitCost
              ? new Prisma.Decimal(input.unitCost)
              : null,
            note: input.note ?? null,
            createdBy: input.createdBy,
          },
          include: { user: { select: { id: true, name: true } } },
        });
        return {
          currentStock: currentStock + input.quantity,
          movement: {
            id: movement.id,
            type: movement.type,
            quantity: movement.quantity,
            unitCost: movement.unitCost?.toFixed(2) ?? null,
            note: movement.note,
            createdBy: movement.user,
            createdAt: movement.createdAt,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async getStock(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!product) return null;
    const movements = await this.prisma.stockMovement.findMany({
      where: { productId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      currentStock: movements.reduce((sum, item) => sum + item.quantity, 0),
      movements: movements.map((movement) => ({
        id: movement.id,
        type: movement.type,
        quantity: movement.quantity,
        unitCost: movement.unitCost?.toFixed(2) ?? null,
        note: movement.note,
        createdBy: movement.user,
        createdAt: movement.createdAt,
      })),
    };
  }
}
