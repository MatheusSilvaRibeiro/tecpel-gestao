export type ProductType = 'PERFUME' | 'CREAM';
export type StockMovementType = 'ENTRY' | 'ADJUSTMENT';

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  type: ProductType;
  salePrice: string;
  imageUrl: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithStock extends Product {
  currentStock: number;
}

export interface StockMovement {
  id: string;
  type: StockMovementType;
  quantity: number;
  unitCost: string | null;
  note: string | null;
  createdBy: { id: string; name: string };
  createdAt: Date;
}

export interface ProductInput {
  name: string;
  brand?: string | null;
  description?: string | null;
  type: ProductType;
  salePrice: string;
  imageUrl?: string | null;
}

export interface ProductFilters {
  search?: string;
  type?: ProductType;
  active?: boolean;
}

export interface MovementInput {
  productId: string;
  type: StockMovementType;
  quantity: number;
  unitCost?: string;
  note?: string;
  createdBy: string;
}

export interface ProductStore {
  create(input: ProductInput): Promise<ProductWithStock>;
  list(filters: ProductFilters): Promise<ProductWithStock[]>;
  findById(id: string): Promise<ProductWithStock | null>;
  update(
    id: string,
    input: Partial<ProductInput>,
  ): Promise<ProductWithStock | null>;
  deactivate(id: string): Promise<boolean>;
  registerMovement(
    input: MovementInput,
  ): Promise<{ movement: StockMovement; currentStock: number }>;
  getStock(
    id: string,
  ): Promise<{ currentStock: number; movements: StockMovement[] } | null>;
}
