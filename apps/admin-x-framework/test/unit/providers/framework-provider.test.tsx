import { QueryClient, QueryObserver, useQuery } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { FrameworkProvider } from '../../../src/providers/framework-provider';
import { withQueryErrorPolicy } from '../../../src/utils/api/query-error-policy';

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

  it('reports once when multiple framework providers share a query cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const error = new Error('Shared cache query failed');

    render(
      <>
        <FrameworkProvider {...frameworkProps} queryClient={queryClient}>
          <div />
        </FrameworkProvider>
        <FrameworkProvider {...frameworkProps} queryClient={queryClient}>
          <div />
        </FrameworkProvider>
      </>,
    );

    await expect(
      queryClient.fetchQuery({
        queryKey: ['shared-cache-reported'],
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

  it('keeps an opted-out in-flight request isolated from a later reporting observer', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const error = new Error('Shared query failed');
    const queryKey = ['shared'];
    let rejectRequest!: (reason: Error) => void;
    const request = new Promise<never>((_resolve, reject) => {
      rejectRequest = reject;
    });

    render(
      <FrameworkProvider {...frameworkProps} queryClient={queryClient}>
        <div />
      </FrameworkProvider>,
    );

    const queryPromise = queryClient.fetchQuery({
      queryKey,
      queryFn: (context) => withQueryErrorPolicy(context, false, () => request),
      meta: { defaultErrorHandler: false },
    });

    const reportingObserver = new QueryObserver(queryClient, {
      queryKey,
      queryFn: () => request,
      enabled: false,
      meta: { defaultErrorHandler: true },
    });
    const unsubscribeReporting = reportingObserver.subscribe(() => {});

    rejectRequest(error);
    await expect(queryPromise).rejects.toBe(error);

    expect(mockHandleError).not.toHaveBeenCalled();

    unsubscribeReporting();
    queryClient.clear();
  });

  it('keeps an opted-in in-flight request active after a later observer opts out', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const error = new Error('Shared query failed');
    const queryKey = ['shared-opted-in'];
    let rejectRequest!: (reason: Error) => void;
    const request = new Promise<never>((_resolve, reject) => {
      rejectRequest = reject;
    });

    render(
      <FrameworkProvider {...frameworkProps} queryClient={queryClient}>
        <div />
      </FrameworkProvider>,
    );

    const queryPromise = queryClient.fetchQuery({
      queryKey,
      queryFn: (context) => withQueryErrorPolicy(context, true, () => request),
      meta: { defaultErrorHandler: true },
    });

    const optedOutObserver = new QueryObserver(queryClient, {
      queryKey,
      queryFn: () => request,
      enabled: false,
      meta: { defaultErrorHandler: false },
    });
    const unsubscribeOptedOut = optedOutObserver.subscribe(() => {});

    rejectRequest(error);
    await expect(queryPromise).rejects.toBe(error);

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledTimes(1);
    });
    expect(mockHandleError).toHaveBeenCalledWith(error, { sentryDSN: null });

    unsubscribeOptedOut();
    queryClient.clear();
  });

  it('does not reuse a successful resource request policy for a later imperative failure', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const queryKey = ['reused-after-success'];
    const error = new Error('Later imperative failure');

    render(
      <FrameworkProvider {...frameworkProps} queryClient={queryClient}>
        <div />
      </FrameworkProvider>,
    );

    await queryClient.fetchQuery({
      queryKey,
      queryFn: (context) =>
        withQueryErrorPolicy(context, false, () => Promise.resolve('resource success')),
      meta: { defaultErrorHandler: false },
    });

    await expect(
      queryClient.fetchQuery({
        queryKey,
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

  it('does not reuse a cancelled resource request policy for a later imperative failure', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const queryKey = ['reused-after-cancel'];
    const error = new Error('Later imperative failure');
    let resolveRequest!: (value: string) => void;
    const request = new Promise<string>((resolve) => {
      resolveRequest = resolve;
    });

    render(
      <FrameworkProvider {...frameworkProps} queryClient={queryClient}>
        <div />
      </FrameworkProvider>,
    );

    const cancelledQuery = queryClient.fetchQuery({
      queryKey,
      queryFn: (context) => withQueryErrorPolicy(context, false, () => request),
      meta: { defaultErrorHandler: false },
    });
    await queryClient.cancelQueries({ queryKey });
    await expect(cancelledQuery).rejects.toBeDefined();

    await expect(
      queryClient.fetchQuery({
        queryKey,
        queryFn: () => Promise.reject(error),
        meta: { defaultErrorHandler: true },
      }),
    ).rejects.toBe(error);

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledTimes(1);
    });
    expect(mockHandleError).toHaveBeenCalledWith(error, { sentryDSN: null });

    resolveRequest('late resource success');
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
