import { useQuery } from '@tanstack/react-query';
import { getSale, listSales } from '../services/sales-api';

export const useSales = () =>
  useQuery({ queryKey: ['sales'], queryFn: () => listSales() });
export const useSale = (id: string) =>
  useQuery({
    queryKey: ['sales', id],
    queryFn: () => getSale(id),
    enabled: Boolean(id),
  });
