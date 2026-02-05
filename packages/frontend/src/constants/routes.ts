export const appRoutes = {
  dashboard: '/',
  analytics: '/analytics',
  team: '/team',
  settings: '/settings',
  caseDetail: '/case/:id',
} as const;

export const getCaseDetailRoute = (id: number | string) => `/case/${id}`;
