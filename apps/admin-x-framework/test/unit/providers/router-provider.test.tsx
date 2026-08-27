import { QueryClient } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { Outlet } from 'react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FrameworkProvider } from '../../../src/providers/framework-provider';
import { Navigate, RouterProvider } from '../../../src/providers/router-provider';
import { TestWrapper } from '../../../src/test/test-utils';

const frameworkProps = {
  externalNavigate: () => {},
  ghostVersion: '5.x',
  sentryDSN: null,
  unsplashConfig: {
    Authorization: '',
    'Accept-Version': '',
    'Content-Type': '',
    'App-Pragma': 'no-cache',
    'X-Unsplash-Cache': true,
  },
  onDelete: () => {},
  onInvalidate: () => {},
  onUpdate: () => {},
};

describe('default route error recovery', () => {
  it('clears failed queries even when they retain cached data', async () => {
    const queryClient = new QueryClient();
    const cachedQueryKey = ['cached-refetch-failure'];
    const unrelatedQueryKey = ['unrelated-failure'];
    const routeError = new Error('Refetch failed');
    queryClient.setQueryData(cachedQueryKey, { value: 'stale' });
    queryClient.getQueryCache().find({ queryKey: cachedQueryKey })?.setState({
      error: routeError,
      status: 'error',
    });
    queryClient.setQueryData(unrelatedQueryKey, { value: 'still usable' });
    queryClient
      .getQueryCache()
      .find({ queryKey: unrelatedQueryKey })
      ?.setState({
        error: new Error('Unrelated refetch failed'),
        status: 'error',
      });
    window.location.hash = '#/failed';

    const FailedRoute = () => {
      throw routeError;
    };

    render(
      <FrameworkProvider {...frameworkProps} queryClient={queryClient}>
        <RouterProvider
          prefix=""
          routes={[
            { path: '/', element: <div>Dashboard</div> },
            { path: '/failed', element: <FailedRoute /> },
          ]}
        >
          <Outlet />
        </RouterProvider>
      </FrameworkProvider>,
    );

    await screen.findByRole('heading', { name: 'Loading interrupted' });
    fireEvent.click(screen.getByText('← Back to the dashboard', { exact: true }));

    await screen.findByText('Dashboard');
    expect(queryClient.getQueryCache().find({ queryKey: cachedQueryKey })).toBeUndefined();
    expect(queryClient.getQueryCache().find({ queryKey: unrelatedQueryKey })).toBeDefined();
  });

  it('cancels and removes sibling queries that are still fetching', async () => {
    const queryClient = new QueryClient();
    const errorResetScope = 'route-bootstrap';
    const failedQueryKey = ['failed-bootstrap-query'];
    const fetchingQueryKey = ['late-sibling-failure'];
    const routeError = new Error('Route failed');
    queryClient.setQueryDefaults(failedQueryKey, {
      meta: { errorResetScope },
    });
    queryClient.setQueryData(failedQueryKey, { value: 'stale' });
    queryClient
      .getQueryCache()
      .find({ queryKey: failedQueryKey })
      ?.setState({ error: routeError, status: 'error' });
    let rejectQuery!: (error: Error) => void;
    const pendingFailure = new Promise<never>((_resolve, reject) => {
      rejectQuery = reject;
    });
    const queryPromise = queryClient
      .fetchQuery({
        queryKey: fetchingQueryKey,
        queryFn: () => pendingFailure,
        meta: { errorResetScope },
      })
      .catch(() => undefined);
    window.location.hash = '#/failed';

    const FailedRoute = () => {
      throw routeError;
    };

    render(
      <FrameworkProvider {...frameworkProps} queryClient={queryClient}>
        <RouterProvider
          prefix=""
          routes={[
            { path: '/', element: <div>Dashboard</div> },
            { path: '/failed', element: <FailedRoute /> },
          ]}
        >
          <Outlet />
        </RouterProvider>
      </FrameworkProvider>,
    );

    await screen.findByRole('heading', { name: 'Loading interrupted' });
    expect(queryClient.getQueryState(fetchingQueryKey)?.fetchStatus).toBe('fetching');

    fireEvent.click(screen.getByText('← Back to the dashboard', { exact: true }));

    await screen.findByText('Dashboard');
    expect(queryClient.getQueryCache().find({ queryKey: fetchingQueryKey })).toBeUndefined();

    rejectQuery(new Error('Late sibling failed'));
    await queryPromise;
    expect(queryClient.getQueryCache().find({ queryKey: fetchingQueryKey })).toBeUndefined();
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
