// Central HTTP client for the JewelSync REST API.
// Base URL comes from VITE_API_BASE_URL (default "/api/v1", proxied to the backend by Vite in dev).

const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api/v1';
const TOKEN_KEY = 'jewelsync_token';
const REQUEST_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  status: number;
  errorCode: string;
  details?: Array<{ field: string; message: string }>;

  constructor(status: number, errorCode: string, message: string, details?: ApiError['details']) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Fired when the server rejects our session so the app can return to the login screen. */
export const AUTH_EXPIRED_EVENT = 'jewelsync:auth-expired';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  auth?: boolean;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function rawRequest(path: string, opts: RequestOptions = {}): Promise<{ data: unknown; pagination?: Paginated<unknown>['pagination'] }> {
  const { method = 'GET', body, query, headers = {}, auth = true } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (auth && token) finalHeaders.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'The server took too long to respond. Please try again.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return { data: null };

  let payload: { success?: boolean; message?: string; errorCode?: string; details?: ApiError['details']; data?: unknown; pagination?: Paginated<unknown>['pagination'] } = {};
  try {
    payload = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok || payload.success === false) {
    if (res.status === 401 && auth && payload.errorCode !== 'INVALID_CREDENTIALS') {
      tokenStore.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(
      res.status,
      payload.errorCode || 'REQUEST_FAILED',
      payload.message || 'Something went wrong. Please try again.',
      payload.details
    );
  }
  return { data: payload.data, pagination: payload.pagination };
}

export async function api<T = unknown>(path: string, opts?: RequestOptions): Promise<T> {
  return (await rawRequest(path, opts)).data as T;
}

/** Fetches every page of a paginated list endpoint. */
export async function apiListAll<T>(path: string, query: Record<string, string | number | boolean | undefined> = {}): Promise<T[]> {
  const limit = 500;
  const out: T[] = [];
  let page = 1;
  for (;;) {
    const res = await rawRequest(path, { query: { ...query, page, limit } });
    out.push(...((res.data as T[]) ?? []));
    if (!res.pagination || page >= res.pagination.totalPages) break;
    page += 1;
  }
  return out;
}

export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback;
}
