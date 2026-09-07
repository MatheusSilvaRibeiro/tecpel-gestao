import { AppError } from '../../errors/app-error.js';
import type { CreateSaleInput, SaleFilters, SaleStore } from './sale-store.js';

export class CreateSale {
  constructor(private readonly store: SaleStore) {}
  execute(input: CreateSaleInput) {
    return this.store.create(input);
  }
}
export class ListSales {
  constructor(private readonly store: SaleStore) {}
  execute(filters: SaleFilters) {
    return this.store.list(filters);
  }
}
export class GetSale {
  constructor(private readonly store: SaleStore) {}
  async execute(id: string) {
    const sale = await this.store.findById(id);
    if (!sale)
      throw new AppError(404, 'SALE_NOT_FOUND', 'Venda não encontrada.');
    return sale;
  }
}
