import { fireEvent, render, screen } from '@testing-library/react';
import { SidebarProvider } from '@tryghost/shade/components';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { useImportProgress } from '@/content-import/api';
import { NavImportProgress } from './nav-import-progress';

vi.mock('@/content-import/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/content-import/api')>()),
  useImportProgress: vi.fn(),
}));

const progress = {
  import_id: 'abcdefabcdefabcdefabcdef',
  status: 'running' as const,
  processed: 62,
  total: 100,
  stale: false,
};

function show(imports: ReturnType<typeof useImportProgress>['imports']) {
  vi.mocked(useImportProgress).mockReturnValue({ imports, track: vi.fn(), dismiss: vi.fn() });
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <SidebarProvider>
            <ul>
              <NavImportProgress />
            </ul>
          </SidebarProvider>
        ),
      },
    ],
    { initialEntries: ['/tags?type=internal'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

it('links the first unfinished import to Migration tools and preserves the return route', async () => {
  const router = show([
    { ...progress, status: 'complete' },
    { ...progress, import_id: 'bcdefabcdefabcdefabcdefa' },
    { ...progress, import_id: 'cdefabcdefabcdefabcdefab', processed: 20 },
  ]);
  const link = screen.getByRole('link', { name: /Import progress\s*62%/ });
  expect(link).toHaveAttribute('href', '/settings/migration');
  fireEvent.click(link);
  await vi.waitFor(() => expect(router.state.location.pathname).toBe('/settings/migration'));
  expect(router.state.location.state).toEqual({ settingsReturnTo: '/tags?type=internal' });
});

it.each([
  { name: 'empty', imports: [] },
  {
    name: 'finished',
    imports: [
      { ...progress, status: 'complete' as const },
      { ...progress, status: 'failed' as const },
    ],
  },
])('hides the entry when there are no unfinished imports ($name)', ({ imports }) => {
  show(imports);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
