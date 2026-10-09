import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { RouteError } from './route-error';

const { reloadAdmin } = vi.hoisted(() => ({ reloadAdmin: vi.fn() }));

vi.mock('@/auth/api', () => ({ reloadAdmin }));

function renderFailedRoute(error: Error) {
  const router = createMemoryRouter(
    [
      {
        path: '/tags',
        loader: () => {
          throw error;
        },
        element: null,
        errorElement: <RouteError />,
      },
    ],
    { initialEntries: ['/tags?type=internal'] },
  );
  render(<RouterProvider router={router} />);
}

describe('RouteError', () => {
  beforeEach(() => {
    reloadAdmin.mockReset();
  });

  afterEach(cleanup);

  it('offers to reload the admin at the screen whose code failed to load', async () => {
    renderFailedRoute(new TypeError('Importing a module script failed.'));

    fireEvent.click(await screen.findByRole('button', { name: 'Reload' }));

    expect(reloadAdmin.mock.calls).toEqual([['/tags?type=internal']]);
  });

  it('keeps the generic error page for other failures', async () => {
    renderFailedRoute(new Error('Route crashed'));

    expect(await screen.findByText('Loading interrupted')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull();
  });
});
