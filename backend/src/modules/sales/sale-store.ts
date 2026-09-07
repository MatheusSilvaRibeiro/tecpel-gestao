import type { UserRole } from '../auth/user-store.js';

export type PaymentMethod =
  'CASH' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'OTHER';
export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: string;
}
export interface CreateSaleInput {
  soldById: string;
  role: UserRole;
  paymentMethod: PaymentMethod;
  items: CreateSaleItemInput[];
}
export interface SaleItem {
  id: string;
  product: { id: string; name: string };
  quantity: number;
  unitPrice: string;
  unitCost: string;
  subtotal: string;
  profit: string;
}
export interface Sale {
  id: string;
  soldBy: { id: string; name: string };
  paymentMethod: PaymentMethod;
  totalAmount: string;
  totalCost: string;
  totalProfit: string;
  createdAt: Date;
  items?: SaleItem[];
}
export interface SaleFilters {
  from?: Date;
  to?: Date;
  soldById?: string;
  paymentMethod?: PaymentMethod;
}
export interface SaleStore {
  create(input: CreateSaleInput): Promise<Sale>;
  list(filters: SaleFilters): Promise<Sale[]>;
  findById(id: string): Promise<Sale | null>;
}
