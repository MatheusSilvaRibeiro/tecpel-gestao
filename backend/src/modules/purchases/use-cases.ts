import { AppError } from '../../errors/app-error.js';
import type {
  CreatePurchaseInput,
  PurchaseFilters,
  PurchaseStore,
} from './purchase-store.js';
export class CreatePurchase {
  constructor(private readonly store: PurchaseStore) {}
  execute(input: CreatePurchaseInput) {
    return this.store.create(input);
  }
}
export class ListPurchases {
  constructor(private readonly store: PurchaseStore) {}
  execute(filters: PurchaseFilters) {
    return this.store.list(filters);
  }
}
export class GetPurchase {
  constructor(private readonly store: PurchaseStore) {}
  async execute(id: string) {
    const purchase = await this.store.findById(id);
    if (!purchase)
      throw new AppError(404, 'PURCHASE_NOT_FOUND', 'Compra não encontrada.');
    return purchase;
  }
}
export class GetProductCost {
  constructor(private readonly store: PurchaseStore) {}
  execute(productId: string) {
    return this.store.getProductCost(productId);
  }
}
