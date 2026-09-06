import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { AppError } from '../src/errors/app-error.js';
import type { AuthUser, UserStore } from '../src/modules/auth/user-store.js';
import type {
  MovementInput,
  ProductFilters,
  ProductInput,
  ProductStore,
  ProductWithStock,
  StockMovement,
} from '../src/modules/products/product-store.js';
import { createTokenService } from '../src/modules/auth/token.js';

class MemoryUserStore implements UserStore {
  constructor(readonly users: AuthUser[]) {}
  findById(id: string) {
    return Promise.resolve(this.users.find((user) => user.id === id) ?? null);
  }
  findByUsername(username: string) {
    return Promise.resolve(
      this.users.find((user) => user.username === username) ?? null,
    );
  }
}

class MemoryProductStore implements ProductStore {
  products: ProductWithStock[] = [];
  movements = new Map<string, StockMovement[]>();
  private nextId = 1;

  create(input: ProductInput) {
    const now = new Date('2026-09-06T12:00:00.000Z');
    const product = {
      id: `product-${this.nextId++}`,
      name: input.name,
      brand: input.brand ?? null,
      description: input.description ?? null,
      type: input.type,
      salePrice: Number(input.salePrice).toFixed(2),
      imageUrl: input.imageUrl ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
      currentStock: 0,
    } satisfies ProductWithStock;
    this.products.push(product);
    return Promise.resolve(product);
  }
  list(filters: ProductFilters) {
    return Promise.resolve(
      this.products.filter(
        (product) =>
          (!filters.search ||
            product.name
              .toLowerCase()
              .includes(filters.search.toLowerCase())) &&
          (!filters.type || product.type === filters.type) &&
          (filters.active === undefined || product.active === filters.active),
      ),
    );
  }
  findById(id: string) {
    return Promise.resolve(
      this.products.find((item) => item.id === id) ?? null,
    );
  }
  async update(id: string, input: Partial<ProductInput>) {
    const product = this.products.find((item) => item.id === id);
    if (!product) return null;
    Object.assign(
      product,
      input,
      input.salePrice ? { salePrice: Number(input.salePrice).toFixed(2) } : {},
    );
    return product;
  }
  async deactivate(id: string) {
    const product = this.products.find((item) => item.id === id);
    if (!product) return false;
    product.active = false;
    return true;
  }
  async registerMovement(input: MovementInput) {
    const product = this.products.find((item) => item.id === input.productId);
    if (!product)
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
    if (!product.active)
      throw new AppError(
        409,
        'PRODUCT_INACTIVE',
        'Produto inativo não pode movimentar estoque.',
      );
    if (product.currentStock + input.quantity < 0) {
      throw new AppError(
        409,
        'INSUFFICIENT_STOCK',
        'O ajuste deixaria o estoque negativo.',
      );
    }
    product.currentStock += input.quantity;
    const movement: StockMovement = {
      id: `movement-${this.nextId++}`,
      type: input.type,
      quantity: input.quantity,
      unitCost: input.unitCost ? Number(input.unitCost).toFixed(2) : null,
      note: input.note ?? null,
      createdBy: { id: input.createdBy, name: 'Administrador' },
      createdAt: new Date('2026-09-06T12:00:00.000Z'),
    };
    this.movements.set(input.productId, [
      movement,
      ...(this.movements.get(input.productId) ?? []),
    ]);
    return { movement, currentStock: product.currentStock };
  }
  async getStock(id: string) {
    const product = this.products.find((item) => item.id === id);
    return product
      ? {
          currentStock: product.currentStock,
          movements: this.movements.get(id) ?? [],
        }
      : null;
  }
}

const admin: AuthUser = {
  id: 'admin-id',
  name: 'Administrador',
  username: 'admin',
  email: 'admin@tecpel.local',
  passwordHash: 'unused',
  role: 'ADMIN',
  active: true,
};
const seller: AuthUser = {
  ...admin,
  id: 'seller-id',
  username: 'seller',
  role: 'VENDEDOR',
};
const tokens = createTokenService({
  secret: 'products-test-secret-with-at-least-32-chars',
  expiresIn: '8h',
});
const uploadDirectory = await mkdtemp(path.join(tmpdir(), 'tecpel-products-'));
const store = new MemoryProductStore();
const app = createApp({
  userStore: new MemoryUserStore([admin, seller]),
  tokenService: tokens,
  authCookie: { name: 'tecpel_auth', maxAgeMs: 1000 },
  productStore: store,
  uploadDirectory,
});
const cookie = (user: AuthUser) => `tecpel_auth=${tokens.sign(user.id)}`;

describe('products and stock HTTP', () => {
  beforeEach(() => {
    store.products = [];
    store.movements.clear();
  });
  afterAll(() => rm(uploadDirectory, { recursive: true, force: true }));

  async function createProduct() {
    const response = await request(app)
      .post('/products')
      .set('Cookie', cookie(admin))
      .field('name', ' Kaiak ')
      .field('brand', 'Natura')
      .field('type', 'PERFUME')
      .field('salePrice', '149.90');
    return response.body.data.product as ProductWithStock;
  }

  it('creates, trims and lists a valid product with decimal money and zero stock', async () => {
    const product = await createProduct();
    expect(product).toMatchObject({
      name: 'Kaiak',
      type: 'PERFUME',
      salePrice: '149.90',
      active: true,
      currentStock: 0,
    });
    const response = await request(app)
      .get('/products?search=kai&type=PERFUME&active=true')
      .set('Cookie', cookie(seller));
    expect(response.status).toBe(200);
    expect(response.body.data.products).toHaveLength(1);
  });

  it('rejects an invalid sale price and malicious active input', async () => {
    const invalidPrice = await request(app)
      .post('/products')
      .set('Cookie', cookie(admin))
      .field('name', 'Kaiak')
      .field('type', 'PERFUME')
      .field('salePrice', '0');
    expect(invalidPrice.status).toBe(400);
    const product = await request(app)
      .post('/products')
      .set('Cookie', cookie(admin))
      .field('name', 'Kaiak')
      .field('type', 'PERFUME')
      .field('salePrice', '10.00')
      .field('active', 'false');
    expect(product.body.data.product.active).toBe(true);
  });

  it('allows ADMIN to update and soft-delete, preserving inactive filtering', async () => {
    const product = await createProduct();
    expect(
      (
        await request(app)
          .patch(`/products/${product.id}`)
          .set('Cookie', cookie(admin))
          .field('salePrice', '159.90')
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .delete(`/products/${product.id}`)
          .set('Cookie', cookie(admin))
      ).body.message,
    ).toContain('desativado');
    const list = await request(app)
      .get('/products?active=false')
      .set('Cookie', cookie(admin));
    expect(list.body.data.products[0]).toMatchObject({
      id: product.id,
      active: false,
    });
  });

  it('returns PRODUCT_NOT_FOUND for an unknown product', async () => {
    const response = await request(app)
      .get('/products/missing')
      .set('Cookie', cookie(admin));
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('blocks every write operation for VENDEDOR', async () => {
    const product = await createProduct();
    const calls = [
      request(app)
        .post('/products')
        .set('Cookie', cookie(seller))
        .field('name', 'X'),
      request(app)
        .patch(`/products/${product.id}`)
        .set('Cookie', cookie(seller))
        .field('name', 'X'),
      request(app)
        .delete(`/products/${product.id}`)
        .set('Cookie', cookie(seller)),
      request(app)
        .post(`/products/${product.id}/stock/entries`)
        .set('Cookie', cookie(seller))
        .send({ quantity: 1, unitCost: '1.00' }),
    ];
    for (const call of calls) expect((await call).status).toBe(403);
  });

  it.each([
    [{ quantity: 0, unitCost: '10.00' }, 'invalid quantity'],
    [{ quantity: 2 }, 'missing cost'],
    [{ quantity: 2, unitCost: '0' }, 'invalid cost'],
  ])('rejects invalid stock entries: %s', async (body) => {
    const product = await createProduct();
    const response = await request(app)
      .post(`/products/${product.id}/stock/entries`)
      .set('Cookie', cookie(admin))
      .send(body);
    expect(response.status).toBe(400);
  });

  it('registers entry, positive and negative delta adjustments and calculates stock', async () => {
    const product = await createProduct();
    await request(app)
      .post(`/products/${product.id}/stock/entries`)
      .set('Cookie', cookie(admin))
      .send({ quantity: 10, unitCost: '32.50' })
      .expect(201);
    await request(app)
      .post(`/products/${product.id}/stock/adjustments`)
      .set('Cookie', cookie(admin))
      .send({ quantity: 3, note: 'Contagem' })
      .expect(201);
    await request(app)
      .post(`/products/${product.id}/stock/adjustments`)
      .set('Cookie', cookie(admin))
      .send({ quantity: -2, note: 'Danificado' })
      .expect(201);
    const response = await request(app)
      .get(`/products/${product.id}/stock`)
      .set('Cookie', cookie(seller));
    expect(response.body.data.currentStock).toBe(11);
    expect(response.body.data.movements).toHaveLength(3);
  });

  it.each([
    { quantity: 0, note: 'Contagem' },
    { quantity: 1, note: '' },
  ])('rejects invalid adjustments', async (body) => {
    const product = await createProduct();
    await request(app)
      .post(`/products/${product.id}/stock/adjustments`)
      .set('Cookie', cookie(admin))
      .send(body)
      .expect(400);
  });

  it('rejects an adjustment that would produce negative stock without persisting it', async () => {
    const product = await createProduct();
    const response = await request(app)
      .post(`/products/${product.id}/stock/adjustments`)
      .set('Cookie', cookie(admin))
      .send({ quantity: -1, note: 'Perda' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect((await store.getStock(product.id))?.movements).toHaveLength(0);
  });

  it('blocks movements for inactive products', async () => {
    const product = await createProduct();
    await store.deactivate(product.id);
    const response = await request(app)
      .post(`/products/${product.id}/stock/entries`)
      .set('Cookie', cookie(admin))
      .send({ quantity: 1, unitCost: '10.00' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PRODUCT_INACTIVE');
  });

  it('accepts a valid image and rejects non-images', async () => {
    const valid = await request(app)
      .post('/products')
      .set('Cookie', cookie(admin))
      .field('name', 'Creme')
      .field('type', 'CREAM')
      .field('salePrice', '25.00')
      .attach('image', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
        filename: '../../unsafe.jpg',
        contentType: 'image/jpeg',
      });
    expect(valid.body.data.product.imageUrl).toMatch(
      /^\/uploads\/products\/[\w-]+\.jpg$/,
    );
    await request(app).get(valid.body.data.product.imageUrl).expect(200);
    const invalid = await request(app)
      .post('/products')
      .set('Cookie', cookie(admin))
      .field('name', 'Creme')
      .field('type', 'CREAM')
      .field('salePrice', '25.00')
      .attach('image', Buffer.from('text'), {
        filename: 'file.txt',
        contentType: 'text/plain',
      });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_IMAGE');

    const spoofed = await request(app)
      .post('/products')
      .set('Cookie', cookie(admin))
      .field('name', 'Creme')
      .field('type', 'CREAM')
      .field('salePrice', '25.00')
      .attach('image', Buffer.from('not-an-image'), {
        filename: 'fake.jpg',
        contentType: 'image/jpeg',
      });
    expect(spoofed.status).toBe(400);
    expect(spoofed.body.error.code).toBe('INVALID_IMAGE');

    const oversized = await request(app)
      .post('/products')
      .set('Cookie', cookie(admin))
      .field('name', 'Creme')
      .field('type', 'CREAM')
      .field('salePrice', '25.00')
      .attach('image', Buffer.alloc(5 * 1024 * 1024 + 1, 1), {
        filename: 'large.jpg',
        contentType: 'image/jpeg',
      });
    expect(oversized.status).toBe(400);
    expect(oversized.body.error.code).toBe('INVALID_IMAGE');
  });
});
