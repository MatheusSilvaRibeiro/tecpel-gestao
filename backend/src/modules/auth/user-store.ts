export type UserRole = 'ADMIN' | 'VENDEDOR';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
}

export interface UserStore {
  findById(id: string): Promise<AuthUser | null>;
  findByUsername(username: string): Promise<AuthUser | null>;
}

export type PublicUser = Omit<AuthUser, 'passwordHash'>;

export function toPublicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    active: user.active,
  };
}
