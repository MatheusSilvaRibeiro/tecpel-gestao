export type ErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHENTICATED'
  | 'USER_INACTIVE'
  | 'FORBIDDEN'
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_INACTIVE'
  | 'INSUFFICIENT_STOCK'
  | 'SALE_NOT_FOUND'
  | 'PURCHASE_NOT_FOUND'
  | 'INVALID_PURCHASE'
  | 'DUPLICATE_PRODUCT'
  | 'INVALID_IMAGE'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
