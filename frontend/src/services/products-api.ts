import { apiRequest } from './api-client';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';
export const productImageSrc = (imageUrl: string | null) =>
  imageUrl ? `${apiUrl}${imageUrl}` : null;

export type ProductType = 'PERFUME' | 'CREAM';
export interface Product {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  type: ProductType;
  salePrice: string;
  imageUrl: string | null;
  active: boolean;
  currentStock: number;
  createdAt: string;
  updatedAt: string;
}
export interface StockMovement {
  id: string;
  type: 'ENTRY' | 'ADJUSTMENT';
  quantity: number;
  unitCost: string | null;
  note: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
}
export interface ProductFilters {
  search?: string;
  type?: ProductType;
  active?: string;
}

function toFormData(input: Record<string, string | File | null | undefined>) {
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  return form;
}

export async function listProducts(filters: ProductFilters) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const data = await apiRequest<{ products: Product[] }>(`/products?${query}`);
  return data.products;
}
export async function getProduct(id: string) {
  return (await apiRequest<{ product: Product }>(`/products/${id}`)).product;
}
export async function createProduct(
  input: Record<string, string | File | null | undefined>,
) {
  return (
    await apiRequest<{ product: Product }>('/products', {
      method: 'POST',
      body: toFormData(input),
    })
  ).product;
}
export async function updateProduct(
  id: string,
  input: Record<string, string | File | null | undefined>,
) {
  return (
    await apiRequest<{ product: Product }>(`/products/${id}`, {
      method: 'PATCH',
      body: toFormData(input),
    })
  ).product;
}
export function deactivateProduct(id: string) {
  return apiRequest<null>(`/products/${id}`, { method: 'DELETE' });
}
export function getProductStock(id: string) {
  return apiRequest<{ currentStock: number; movements: StockMovement[] }>(
    `/products/${id}/stock`,
  );
}
export function registerEntry(
  id: string,
  input: { quantity: number; unitCost: string },
) {
  return apiRequest(`/products/${id}/stock/entries`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
export function registerAdjustment(
  id: string,
  input: { quantity: number; note: string },
) {
  return apiRequest(`/products/${id}/stock/adjustments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
