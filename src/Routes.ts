export const ROUTES = {
  LIST: '/',
  FEED: '/feed',
  DETAIL: '/detail',
  CREATE: '/create',
  LOGIN: '/login',
  REGISTER: '/register',
} as const;

export const detailPath = (id: number) => `${ROUTES.DETAIL}/${id}`;

export function nextFeedPath(id?: number): string {
  const query = new URLSearchParams({ next: 'true' });
  if (id !== undefined) query.set('id', String(id));
  return `${ROUTES.FEED}?${query}`;
}
