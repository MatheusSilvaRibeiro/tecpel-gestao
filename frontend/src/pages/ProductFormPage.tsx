import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ProductShell,
  buttonClass,
  fieldClass,
} from '../components/products/ProductShell';
import { useProduct, useProductMutations } from '../hooks/useProducts';
import { productSchema, type ProductFormValues } from '../schemas/product';
import { ApiError } from '../services/api-client';

export function ProductFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const product = useProduct(id ?? '');
  const mutations = useProductMutations(id);
  const navigate = useNavigate();
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      brand: '',
      description: '',
      type: 'PERFUME',
      salePrice: '',
    },
  });
  useEffect(() => {
    if (product.data)
      form.reset({
        name: product.data.name,
        brand: product.data.brand ?? '',
        description: product.data.description ?? '',
        type: product.data.type,
        salePrice: product.data.salePrice,
      });
  }, [form, product.data]);

  async function submit(values: ProductFormValues) {
    const input = {
      ...values,
      image: values.image?.[0],
      brand: values.brand,
      description: values.description,
    };
    try {
      const saved = editing
        ? await mutations.update.mutateAsync(input)
        : await mutations.create.mutateAsync(input);
      navigate(`/products/${saved.id}`);
    } catch (error) {
      form.setError('root', {
        message:
          error instanceof ApiError
            ? error.message
            : 'Não foi possível salvar o produto.',
      });
    }
  }
  if (editing && product.isLoading)
    return (
      <ProductShell>
        <p>Carregando produto...</p>
      </ProductShell>
    );
  return (
    <ProductShell>
      <h1 className="text-3xl font-bold">
        {editing ? 'Editar produto' : 'Novo produto'}
      </h1>
      <form
        className="mt-7 grid max-w-2xl gap-5"
        onSubmit={form.handleSubmit(submit)}
      >
        <label>
          Nome
          <input className={`${fieldClass} mt-1`} {...form.register('name')} />
        </label>
        {form.formState.errors.name && (
          <p role="alert" className="text-red-300">
            {form.formState.errors.name.message}
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            Marca
            <input
              className={`${fieldClass} mt-1`}
              {...form.register('brand')}
            />
          </label>
          <label>
            Tipo
            <select className={`${fieldClass} mt-1`} {...form.register('type')}>
              <option value="PERFUME">Perfume</option>
              <option value="CREAM">Creme</option>
            </select>
          </label>
        </div>
        <label>
          Descrição
          <textarea
            className={`${fieldClass} mt-1 min-h-28`}
            {...form.register('description')}
          />
        </label>
        <label>
          Preço de venda
          <input
            className={`${fieldClass} mt-1`}
            inputMode="decimal"
            placeholder="149.90"
            {...form.register('salePrice')}
          />
        </label>
        {form.formState.errors.salePrice && (
          <p role="alert" className="text-red-300">
            {form.formState.errors.salePrice.message}
          </p>
        )}
        <label>
          Foto opcional
          <input
            className={`${fieldClass} mt-1`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            {...form.register('image')}
          />
        </label>
        {form.formState.errors.root && (
          <p role="alert" className="text-red-300">
            {form.formState.errors.root.message}
          </p>
        )}
        <button
          className={`${buttonClass} justify-self-start`}
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? 'Salvando...' : 'Salvar produto'}
        </button>
      </form>
    </ProductShell>
  );
}
