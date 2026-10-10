import * as Sentry from '@sentry/react';
import { render, screen, waitFor } from '@testing-library/react';
import { type Location, Outlet } from 'react-router';
import { RouterProvider } from '../../../src/providers/router-provider';
import { TestWrapper } from '../../../src/test/test-utils';

vi.mock('@sentry/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/react')>()),
  getClient: vi.fn(),
  captureException: vi.fn(),
}));

describe('feature flag overrides', () => {
  beforeEach(() => {
    sessionStorage.clear();
    // URL fixtures must not queue navigation events for a router mounted later.
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('notifies the host after storing URL overrides', async () => {
    window.history.replaceState(null, '', '/#/?labs=testFlag');
    const onFeatureFlagOverridesChange = vi.fn(() => {
      expect(sessionStorage.getItem('ghost-admin:labs-overrides')).toBe('["testFlag"]');
    });

    render(
      <TestWrapper frameworkProps={{ onFeatureFlagOverridesChange }}>
        <RouterProvider prefix="/" routes={[{ path: '/', element: <div>Home</div> }]} />
      </TestWrapper>,
    );

    await waitFor(() => expect(onFeatureFlagOverridesChange).toHaveBeenCalled());
  });
});

describe('route errors', () => {
  const error = new Error('Route crashed');

  function Crash(): never {
    throw error;
  }

  // React development builds rethrow caught render errors to the window
  function silenceCrash(event: ErrorEvent) {
    if (event.error === error) {
      event.preventDefault();
    }
  }

  function renderCrashingRoute(recoverFromError?: (error: unknown, location: Location) => boolean) {
    render(
      <TestWrapper>
        <RouterProvider
          errorElement={<div>Route error</div>}
          prefix="/"
          recoverFromError={recoverFromError}
          routes={[{ path: '/', element: <Crash /> }]}
        >
          <Outlet />
        </RouterProvider>
      </TestWrapper>,
    );
  }

  beforeEach(() => {
    // Setting location.hash would queue a navigation and render the crash twice.
    window.history.replaceState(null, '', '/');
    vi.mocked(Sentry.captureException).mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.addEventListener('error', silenceCrash);
  });

  afterEach(() => {
    window.removeEventListener('error', silenceCrash);
    vi.mocked(Sentry.getClient).mockReset();
    vi.restoreAllMocks();
  });

  it('reports render crashes to Sentry with the component stack', async () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as ReturnType<typeof Sentry.getClient>);

    renderCrashingRoute();

    await screen.findByText('Route error');
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      contexts: { react: { componentStack: expect.stringContaining('Crash') } },
    });
  });

  it('leaves an error the app recovers from unreported', async () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as ReturnType<typeof Sentry.getClient>);
    const recoverFromError = vi.fn(() => true);

    renderCrashingRoute(recoverFromError);

    await screen.findByText('Route error');
    expect(recoverFromError).toHaveBeenCalledTimes(1);
    expect(recoverFromError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ pathname: '/' }),
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('reports an error the app does not recover from', async () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as ReturnType<typeof Sentry.getClient>);

    renderCrashingRoute(() => false);

    await screen.findByText('Route error');
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('does not report when Sentry is not initialised', async () => {
    renderCrashingRoute();

    await screen.findByText('Route error');
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
