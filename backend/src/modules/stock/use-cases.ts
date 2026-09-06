import { AppError } from '../../errors/app-error.js';
import type { MovementInput, ProductStore } from '../products/product-store.js';

type StockInput = Omit<MovementInput, 'type'>;

export class RegisterStockEntry {
  constructor(private readonly store: ProductStore) {}
  execute(input: StockInput) {
    return this.store.registerMovement({ ...input, type: 'ENTRY' });
  }
}

export class RegisterStockAdjustment {
  constructor(private readonly store: ProductStore) {}
  execute(input: StockInput) {
    return this.store.registerMovement({ ...input, type: 'ADJUSTMENT' });
  }
}

export class GetProductStock {
  constructor(private readonly store: ProductStore) {}
  async execute(id: string) {
    const stock = await this.store.getStock(id);
    if (!stock)
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
    return stock;
  }
}
