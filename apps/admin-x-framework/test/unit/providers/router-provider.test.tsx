import * as Sentry from '@sentry/react';
import { render, screen, waitFor } from '@testing-library/react';
import { type Location, Outlet } from 'react-router';
import {
  RouterProvider,
  type ViewTransitionController,
  ViewTransitionControllerProvider,
  useNavigate as useFrameworkNavigate,
  useRouterDestination,
} from '../../../src/providers/router-provider';
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

  it('keeps the stored overrides on an app’s page, because its query belongs to the app', async () => {
    sessionStorage.setItem('ghost-admin:labs-overrides', '["storedFlag"]');
    window.history.replaceState(null, '', '/#/apps/6a1b2c3d4e5f60718293a4b5/?labs=');

    render(
      <TestWrapper>
        <RouterProvider prefix="/" routes={[{ path: '/apps/:id/*', element: <div>App</div> }]}>
          <Outlet />
        </RouterProvider>
      </TestWrapper>,
    );

    await screen.findByText('App');
    expect(sessionStorage.getItem('ghost-admin:labs-overrides')).toBe('["storedFlag"]');
  });

  it('reads the overrides on Admin’s own screens under /apps/', async () => {
    window.history.replaceState(null, '', '/#/apps/install?manifest=x&labs=apps');

    render(
      <TestWrapper>
        <RouterProvider
          prefix="/"
          routes={[
            { path: '/apps/install', element: <div>Install</div> },
            { path: '/apps/:id/*', element: <div>App</div> },
          ]}
        >
          <Outlet />
        </RouterProvider>
      </TestWrapper>,
    );

    await screen.findByText('Install');
    expect(sessionStorage.getItem('ghost-admin:labs-overrides')).toBe('["apps"]');
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

describe('useRouterDestination', () => {
  let destination: () => string | undefined;
  let navigate: (path: string) => void;

  function Home() {
    destination = useRouterDestination();
    const frameworkNavigate = useFrameworkNavigate();
    navigate = (path) => frameworkNavigate(path);
    return <div>Home</div>;
  }

  /** Renders a router whose `/slow` route never loads, so a navigation to it stays in progress. */
  async function renderRouter({
    prefix = '/',
    controller = { shouldTransition: () => false },
  }: { prefix?: string; controller?: ViewTransitionController } = {}) {
    render(
      <TestWrapper>
        <RouterProvider
          prefix={prefix}
          routes={[
            { path: '/', Component: Home },
            { path: '/slow', lazy: () => new Promise<never>(() => {}) },
          ]}
        >
          <ViewTransitionControllerProvider value={controller}>
            <Outlet />
          </ViewTransitionControllerProvider>
        </RouterProvider>
      </TestWrapper>,
    );
    await screen.findByText('Home');
  }

  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('returns a navigation’s destination as soon as it starts, before React commits it', async () => {
    await renderRouter();
    expect(destination()).toBe('/');

    navigate('/slow');

    expect(destination()).toBe('/slow');
  });

  it('returns the pathname within the router, without its basename', async () => {
    window.history.replaceState(null, '', '/#/admin/');
    await renderRouter({ prefix: 'admin' });
    expect(destination()).toBe('/');

    navigate('/slow');

    expect(destination()).toBe('/slow');
  });

  it('returns the destination of a navigation a screen transition holds back', async () => {
    let release!: (proceed: boolean) => void;
    await renderRouter({
      controller: {
        shouldTransition: () => true,
        beforeTransition: () =>
          new Promise<boolean>((resolve) => {
            release = resolve;
          }),
      },
    });

    navigate('/slow');
    expect(destination()).toBe('/slow');

    // The transition cancels the navigation, so the router stays where it is.
    release(false);
    await waitFor(() => expect(destination()).toBe('/'));
  });

  it('clears a held navigation whose transition fails', async () => {
    let fail!: (error: Error) => void;
    await renderRouter({
      controller: {
        shouldTransition: () => true,
        beforeTransition: () =>
          new Promise<boolean>((_, reject) => {
            fail = reject;
          }),
      },
    });

    navigate('/slow');
    expect(destination()).toBe('/slow');

    fail(new Error('transition failed'));
    await waitFor(() => expect(destination()).toBe('/'));
  });

  it('returns undefined outside the framework’s router', () => {
    function Outside() {
      destination = useRouterDestination();
      return null;
    }
    render(<Outside />);

    expect(destination()).toBeUndefined();
  });
});
