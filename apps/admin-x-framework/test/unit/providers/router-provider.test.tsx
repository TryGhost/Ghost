import { StrictMode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Outlet } from 'react-router';
import { Navigate, RouterProvider } from '../../../src/providers/router-provider';
import { TestWrapper } from '../../../src/test/test-utils';

const Boom = () => {
  throw new Error('render exploded');
};

const renderErroredRoute = (queryClient: QueryClient) => {
  window.location.hash = '#/test/boom';

  return render(
    <TestWrapper queryClient={queryClient}>
      <RouterProvider
        prefix="test"
        routes={[
          { path: '/', element: <div>home</div> },
          { path: '/boom', element: <Boom /> },
        ]}
      >
        <Outlet />
      </RouterProvider>
    </TestWrapper>,
  );
};

describe('default error element', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  it('resets errored queries and navigates home from the error page', async () => {
    // Not createTestQueryClient: its gcTime of 0 collects the unobserved
    // errored entry before the click can reset it.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    await queryClient
      .fetchQuery({ queryKey: ['bad'], queryFn: () => Promise.reject(new Error('nope')) })
      .catch(() => {});
    queryClient.setQueryData(['good'], { ok: true });
    expect(queryClient.getQueryState(['bad'])?.status).toBe('error');

    renderErroredRoute(queryClient);
    fireEvent.click(await screen.findByText(/Back to the dashboard/));

    await waitFor(() => {
      expect(queryClient.getQueryState(['bad'])?.status).toBe('pending');
    });
    expect(queryClient.getQueryState(['good'])?.status).toBe('success');
    await screen.findByText('home');
  });
});

describe('Navigate', () => {
  it('performs cross-app navigation once after mounting in Strict Mode', async () => {
    const externalNavigate = vi.fn();

    render(
      <StrictMode>
        <TestWrapper frameworkProps={{ externalNavigate }}>
          <Navigate to="/posts" crossApp replace />
        </TestWrapper>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(externalNavigate).toHaveBeenCalledWith({
        isExternal: true,
        replace: true,
        route: '/posts',
      });
    });
    expect(externalNavigate).toHaveBeenCalledTimes(1);
  });

  it('navigates again when the external destination changes', async () => {
    const externalNavigate = vi.fn();
    const { rerender } = render(
      <TestWrapper frameworkProps={{ externalNavigate }}>
        <Navigate to="/posts" crossApp replace />
      </TestWrapper>,
    );

    await waitFor(() => expect(externalNavigate).toHaveBeenCalledTimes(1));

    rerender(
      <TestWrapper frameworkProps={{ externalNavigate }}>
        <Navigate to="/site" crossApp replace />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(externalNavigate).toHaveBeenLastCalledWith({
        isExternal: true,
        replace: true,
        route: '/site',
      });
    });
    expect(externalNavigate).toHaveBeenCalledTimes(2);
  });
});
