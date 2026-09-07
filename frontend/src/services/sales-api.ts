import { apiRequest } from './api-client';

export type PaymentMethod =
  'CASH' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'OTHER';
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
  createdAt: string;
  items?: SaleItem[];
}
export interface NewSaleItem {
  productId: string;
  quantity: number;
  unitPrice?: string;
}

export async function listSales(
  filters: {
    from?: string;
    to?: string;
    soldById?: string;
    paymentMethod?: string;
  } = {},
) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(
    ([key, value]) => value && query.set(key, value),
  );
  return (await apiRequest<{ sales: Sale[] }>(`/sales?${query}`)).sales;
}
export async function getSale(id: string) {
  return (await apiRequest<{ sale: Sale }>(`/sales/${id}`)).sale;
}
export async function createSale(input: {
  paymentMethod: PaymentMethod;
  items: NewSaleItem[];
}) {
  return (
    await apiRequest<{ sale: Sale }>('/sales', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).sale;
}
