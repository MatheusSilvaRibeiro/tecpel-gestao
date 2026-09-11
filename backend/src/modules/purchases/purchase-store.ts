export interface PurchaseItemInput {
  productId: string;
  quantity: number;
  unitCost: string;
}
export interface CreatePurchaseInput {
  supplierName?: string | null;
  invoiceNumber?: string | null;
  purchaseDate: Date;
  createdById: string;
  items: PurchaseItemInput[];
}
export interface PurchaseItem {
  id: string;
  product: {
    id: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
  };
  quantity: number;
  unitCost: string;
  subtotal: string;
}
export interface Purchase {
  id: string;
  supplierName: string | null;
  invoiceNumber: string | null;
  purchaseDate: Date;
  totalAmount: string;
  createdBy: { id: string; name: string };
  createdAt: Date;
  items?: PurchaseItem[];
  itemsCount: number;
}
export interface PurchaseFilters {
  startDate?: Date;
  endDate?: Date;
  supplier?: string;
}
export interface ProductCost {
  lastUnitCost: string;
  lastPurchaseDate: Date;
  grossMarginValue: string;
  grossMarginPercent: string;
}
export interface PurchaseStore {
  create(input: CreatePurchaseInput): Promise<Purchase>;
  list(filters: PurchaseFilters): Promise<Purchase[]>;
  findById(id: string): Promise<Purchase | null>;
  getProductCost(productId: string): Promise<ProductCost | null>;
}
