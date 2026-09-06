import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { open } from 'node:fs/promises';
import path from 'node:path';

import multer from 'multer';

import { AppError } from '../../errors/app-error.js';

const acceptedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

export function createProductUpload(uploadDirectory: string) {
  mkdirSync(uploadDirectory, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: uploadDirectory,
      filename: (_request, file, callback) => {
        callback(
          null,
          `${randomUUID()}${acceptedTypes.get(file.mimetype) ?? ''}`,
        );
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_request, file, callback) => {
      if (!acceptedTypes.has(file.mimetype)) {
        callback(
          new AppError(
            400,
            'INVALID_IMAGE',
            'Envie uma imagem JPEG, PNG ou WebP.',
          ),
        );
        return;
      }
      callback(null, true);
    },
  });
}

export function productImageUrl(filename: string) {
  return path.posix.join('/uploads/products', path.basename(filename));
}

export async function validateProductImage(filePath: string, mimeType: string) {
  const file = await open(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    const valid =
      (mimeType === 'image/jpeg' &&
        bytesRead >= 3 &&
        header.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
      (mimeType === 'image/png' &&
        bytesRead >= 8 &&
        header
          .subarray(0, 8)
          .equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          )) ||
      (mimeType === 'image/webp' &&
        bytesRead >= 12 &&
        header.toString('ascii', 0, 4) === 'RIFF' &&
        header.toString('ascii', 8, 12) === 'WEBP');
    if (!valid)
      throw new AppError(
        400,
        'INVALID_IMAGE',
        'O conteúdo do arquivo não é uma imagem válida.',
      );
  } finally {
    await file.close();
  }
}
