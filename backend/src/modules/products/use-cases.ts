import { AppError } from '../../errors/app-error.js';
import type {
  ProductFilters,
  ProductInput,
  ProductStore,
} from './product-store.js';

export class CreateProduct {
  constructor(private readonly store: ProductStore) {}
  execute(input: ProductInput) {
    return this.store.create(input);
  }
}
export class ListProducts {
  constructor(private readonly store: ProductStore) {}
  execute(filters: ProductFilters) {
    return this.store.list(filters);
  }
}
export class GetProduct {
  constructor(private readonly store: ProductStore) {}
  async execute(id: string) {
    const product = await this.store.findById(id);
    if (!product)
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
    return product;
  }
}
export class UpdateProduct {
  constructor(private readonly store: ProductStore) {}
  async execute(id: string, input: Partial<ProductInput>) {
    const product = await this.store.update(id, input);
    if (!product)
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
    return product;
  }
}
export class DeactivateProduct {
  constructor(private readonly store: ProductStore) {}
  async execute(id: string) {
    if (!(await this.store.deactivate(id)))
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
  }
}
