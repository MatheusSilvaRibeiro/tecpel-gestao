import { describe, expect, it, vi } from 'vitest';
import {
  AuditService,
  auditDiff,
  sanitizeAuditValue,
} from '../src/modules/audit/audit-service.js';

describe('audit service', () => {
  it('keeps only fields that actually changed', () => {
    expect(
      auditDiff(
        { name: 'Kaiak', salePrice: '149.90', brand: 'Natura' },
        { name: 'Kaiak Urbe', salePrice: '159.90', brand: 'Natura' },
      ),
    ).toEqual({
      changed: true,
      before: { name: 'Kaiak', salePrice: '149.90' },
      after: { name: 'Kaiak Urbe', salePrice: '159.90' },
    });
    expect(auditDiff({ name: 'Kaiak' }, { name: 'Kaiak' }).changed).toBe(false);
  });

  it('removes sensitive fields recursively', () => {
    expect(
      sanitizeAuditValue({
        name: 'Admin',
        password: 'a',
        passwordHash: 'b',
        nested: { jwt: 'c', safe: true },
        tokenValue: 'd',
      }),
    ).toEqual({ name: 'Admin', nested: { safe: true } });
  });

  it('sanitizes every payload before persistence', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'audit-1' });
    await new AuditService().record({ auditLog: { create } } as never, {
      userId: 'user-1',
      action: 'CREATE',
      entity: 'PRODUCT',
      entityId: 'product-1',
      after: { name: 'Kaiak', secret: 'hidden' },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ after: { name: 'Kaiak' } }),
      }),
    );
  });
});
