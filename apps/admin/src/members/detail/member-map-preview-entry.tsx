import { createRoot } from 'react-dom/client';
import { Outlet, RouterProvider } from '@tryghost/admin-x-framework';
import Preview from './member-map-preview';

if (import.meta.env.DEV) {
  createRoot(document.getElementById('root')!).render(
    <RouterProvider prefix="" routes={[{ path: '*', element: <Preview /> }]}>
      <Outlet />
    </RouterProvider>,
  );
}
