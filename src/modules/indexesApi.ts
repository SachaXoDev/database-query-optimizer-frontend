const apiOrigin = (import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/$/, '');
const indexes = '/api/indexes';

export interface IndexItem {
  id: number;
  indexName: string;
  shortDescription: string;
  fullDescription: string;
  tableName: string;
  columnName: string;
  indexType: string;
  cardinality: number;
  imageUrl: string | null;
  likesCount: number;
  isLiked: number;
  isOwner: number;
  status: 'draft' | 'published' | 'deleted';
}

export interface CatalogPage {
  items: IndexItem[];
  total: number;
  offset: number;
  limit: number;
}

export interface FeedResult {
  current: IndexItem | null;
  position: number | null;
  batchSize: number;
}

interface FeedQuery {
  id?: number;
  next?: boolean;
}

export interface SessionUser {
  id: number;
  username: string;
  role: string;
}

interface Credentials {
  username: string;
  password: string;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiOrigin}${path}`, { ...init, credentials: 'include', cache: 'no-store' });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const detail = Array.isArray(problem?.message) ? problem.message.join('; ') : problem?.message;
    throw new ApiError(response.status, detail || `Ошибка сервера (HTTP ${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

function json(method: string, body: object): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export function describeError(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Не удалось загрузить данные. Проверьте соединение с сервером.';
}

export function mediaUrl(url: string): string {
  return new URL(url, `${apiOrigin || window.location.origin}/`).href;
}

// Signed URLs can change while still pointing to the same stored object.
export function mediaIdentity(url: string): string {
  const parsed = new URL(url);
  return parsed.searchParams.has('X-Amz-Signature') ? `${parsed.origin}${parsed.pathname}` : url;
}

export function positiveId(value: string | null | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2_147_483_647 ? id : undefined;
}

export function fetchIndexes(
  filters: { limit: number; offset: number; minCardinality?: number },
  signal: AbortSignal,
): Promise<CatalogPage> {
  const query = new URLSearchParams({ limit: String(filters.limit), offset: String(filters.offset) });
  if (filters.minCardinality !== undefined) query.set('minCardinality', String(filters.minCardinality));
  return request(`${indexes}?${query}`, { signal });
}

export function fetchIndexById(id: number, signal: AbortSignal): Promise<IndexItem> {
  return request(`${indexes}/${id}`, { signal });
}

export function fetchFeed({ id, next }: FeedQuery = {}, signal?: AbortSignal): Promise<FeedResult> {
  const query = new URLSearchParams();
  if (id !== undefined) query.set('id', String(id));
  if (next) query.set('next', 'true');
  return request(`${indexes}/feed${query.size ? `?${query}` : ''}`, { signal });
}

export async function fetchDraft(signal: AbortSignal): Promise<IndexItem | null> {
  try {
    return await request(`${indexes}/draft`, { signal });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function saveDraft(fields: FormData): Promise<IndexItem> {
  return request(indexes, { method: 'POST', body: fields });
}

export function publishIndex(id: number): Promise<IndexItem> {
  return request(`${indexes}/${id}/publish`, json('PUT', {}));
}

export function deleteIndex(id: number): Promise<void> {
  return request(`${indexes}/${id}`, { method: 'DELETE' });
}

export function toggleIndexLike(item: IndexItem): Promise<IndexItem> {
  return request(`${indexes}/${item.id}/like`, json('POST', { value: item.isLiked === 1 ? 0 : 1 }));
}

export function fetchSession(signal: AbortSignal): Promise<SessionUser> {
  return request('/api/auth/me', { signal });
}

export async function login(credentials: Credentials): Promise<SessionUser> {
  const { user } = await request<{ user: SessionUser }>('/api/auth/login', json('POST', credentials));
  return user;
}

export function register(credentials: Credentials): Promise<SessionUser> {
  return request('/api/auth/register', json('POST', credentials));
}

export function logout(): Promise<void> {
  return request('/api/auth/logout', { method: 'POST' });
}
