import { compare, hash } from 'bcryptjs';

const PASSWORD_COST_FACTOR = 12;

export function hashPassword(password: string) {
  return hash(password, PASSWORD_COST_FACTOR);
}

export function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}
