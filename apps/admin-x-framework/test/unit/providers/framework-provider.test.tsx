import { QueryClient, QueryObserver, useQuery } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { FrameworkProvider } from '../../../src/providers/framework-provider';

const { mockHandleError } = vi.hoisted(() => ({
  mockHandleError: vi.fn(),
}));

vi.mock('../../../src/utils/handle-error', () => ({
  handleFrameworkError: mockHandleError,
}));

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

describe('FrameworkProvider query error reporting', () => {
  beforeEach(() => {
    mockHandleError.mockClear();
  });

  it('reports opted-in query failures once', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const error = new Error('Query failed');

    render(
      <FrameworkProvider {...frameworkProps} queryClient={queryClient}>
        <div />
      </FrameworkProvider>,
    );

    await expect(
      queryClient.fetchQuery({
        queryKey: ['reported'],
        queryFn: () => Promise.reject(error),
        meta: { defaultErrorHandler: true },
      }),
    ).rejects.toBe(error);

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledTimes(1);
    });
    expect(mockHandleError).toHaveBeenCalledWith(error, { sentryDSN: null });

    queryClient.clear();
  });

  it('reports a mount-time failure once in StrictMode', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const error = new Error('Immediate query failure');
    const FailingQuery = () => {
      useQuery({
        queryKey: ['immediate-failure'],
        queryFn: () => Promise.reject(error),
        meta: { defaultErrorHandler: true },
      });
      return null;
    };

    render(
      <StrictMode>
        <FrameworkProvider {...frameworkProps} queryClient={queryClient}>
          <FailingQuery />
        </FrameworkProvider>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledTimes(1);
    });
    expect(mockHandleError).toHaveBeenCalledWith(error, { sentryDSN: null });

    queryClient.clear();
  });

  it('reports once when mixed observers share a failed query', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const error = new Error('Shared query failed');
    const queryKey = ['shared'];
    const queryFn = () => Promise.reject(error);

    render(
      <FrameworkProvider {...frameworkProps} queryClient={queryClient}>
        <div />
      </FrameworkProvider>,
    );

    const reportingObserver = new QueryObserver(queryClient, {
      queryKey,
      queryFn,
      enabled: false,
      meta: { defaultErrorHandler: true },
    });
    const optedOutObserver = new QueryObserver(queryClient, {
      queryKey,
      queryFn,
      enabled: false,
      meta: { defaultErrorHandler: false },
    });
    const unsubscribeReporting = reportingObserver.subscribe(() => {});
    const unsubscribeOptedOut = optedOutObserver.subscribe(() => {});

    await expect(
      queryClient.fetchQuery({
        queryKey,
        queryFn,
        meta: { defaultErrorHandler: false },
      }),
    ).rejects.toBe(error);

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledTimes(1);
    });
    expect(mockHandleError).toHaveBeenCalledWith(error, { sentryDSN: null });

    unsubscribeReporting();
    unsubscribeOptedOut();
    queryClient.clear();
  });

  it('does not report opted-out query failures', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <FrameworkProvider {...frameworkProps} queryClient={queryClient}>
        <div />
      </FrameworkProvider>,
    );

    await expect(
      queryClient.fetchQuery({
        queryKey: ['not-reported'],
        queryFn: () => Promise.reject(new Error('Expected failure')),
        meta: { defaultErrorHandler: false },
      }),
    ).rejects.toThrow('Expected failure');
    expect(mockHandleError).not.toHaveBeenCalled();

    queryClient.clear();
  });
});
