import { api, tokenStore } from './api-client';
import type { Staff } from '@/types';

interface LoginResult {
  token: string;
  user: Staff;
}

export async function login(email: string, password: string): Promise<Staff> {
  const result = await api<LoginResult>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  tokenStore.set(result.token);
  return result.user;
}

export function logout(): void {
  tokenStore.clear();
}

export async function fetchCurrentUser(): Promise<Staff> {
  return api<Staff>('/auth/me');
}

export function hasSession(): boolean {
  return Boolean(tokenStore.get());
}
