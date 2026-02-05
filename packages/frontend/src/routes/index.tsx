import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components';
import { Dashboard, Analytics, Team, Settings, CaseDetail, ErrorPage } from '@/pages';
import { appRoutes } from '@/constants';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: appRoutes.analytics,
        element: <Analytics />,
      },
      {
        path: appRoutes.team,
        element: <Team />,
      },
      {
        path: appRoutes.settings,
        element: <Settings />,
      },
      {
        path: appRoutes.caseDetail,
        element: <CaseDetail />,
      },
    ],
  },
]);
