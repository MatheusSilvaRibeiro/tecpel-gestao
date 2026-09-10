import { apiRequest } from './api-client';

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
  purchaseDate: string;
  totalAmount: string;
  createdBy: { id: string; name: string };
  createdAt: string;
  itemsCount: number;
  items?: PurchaseItem[];
}
export interface PurchaseFilters {
  startDate?: string;
  endDate?: string;
  supplier?: string;
}
export interface CreatePurchaseInput {
  supplierName?: string;
  invoiceNumber?: string;
  purchaseDate: string;
  items: { productId: string; quantity: number; unitCost: string }[];
}
export async function listPurchases(filters: PurchaseFilters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(
    ([key, value]) => value && query.set(key, value),
  );
  return (await apiRequest<{ purchases: Purchase[] }>(`/purchases?${query}`))
    .purchases;
}
export async function getPurchase(id: string) {
  return (await apiRequest<{ purchase: Purchase }>(`/purchases/${id}`))
    .purchase;
}
export async function createPurchase(input: CreatePurchaseInput) {
  return (
    await apiRequest<{ purchase: Purchase }>('/purchases', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).purchase;
}
