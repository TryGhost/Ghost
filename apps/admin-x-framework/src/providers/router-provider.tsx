import * as Sentry from '@sentry/react';
import React, { useCallback, useContext, useMemo, useRef, useEffect } from 'react';
import {
  type ClientOnErrorFunction,
  createHashRouter,
  Link as ReactRouterLink,
  type LinkProps,
  type RelativeRoutingType,
  resolvePath,
  RouteObject,
  RouterProvider as ReactRouterProvider,
  NavigateOptions as ReactRouterNavigateOptions,
  useNavigate as useReactRouterNavigate,
  useLocation,
  useParams,
  useResolvedPath,
  Navigate as ReactRouterNavigate,
} from 'react-router';
import { useFramework } from './framework-provider';
import { NavigationStackProvider } from './navigation-stack-provider';
import { ErrorPage } from '@tryghost/shade/primitives';
import { syncFeatureFlagOverrides } from '../utils/feature-flag-overrides';
import { FeatureFlagOverridesContext } from './feature-flag-overrides-context';

/**
 * This provider uses React Router to provide a router context to React apps
 * in Ghost. For future apps this is the preferred router provider
 * (not RoutingProvider).
 */

/**
 * Wrap React Router in a custom provider to provide a standard, simplified
 * interface for all Ghost apps for routing. It also sanitizes the routes and
 * adds a default error element.
 */
export interface RouterProviderProps {
  routes: RouteObject[];
  prefix?: string;

  // Custom routing props
  errorElement?: React.ReactNode;
  children?: React.ReactNode;
}

function FeatureFlagOverridesRouteProvider({ children }: { children: React.ReactNode }) {
  const { search } = useLocation();
  const { onFeatureFlagOverridesChange } = useFramework();
  const enabledFlags = useMemo(() => syncFeatureFlagOverrides(search), [search]);
  const value = useMemo(() => ({ enabledFlags }), [enabledFlags]);

  useEffect(() => {
    return onFeatureFlagOverridesChange?.();
  }, [enabledFlags, onFeatureFlagOverridesChange]);

  return (
    <FeatureFlagOverridesContext.Provider value={value}>
      {children}
    </FeatureFlagOverridesContext.Provider>
  );
}

// Store scroll positions globally
const scrollPositions = new Map<string, number>();

export function resetScrollPosition(location: string) {
  scrollPositions.delete(location);
}

interface ScrollRestorationProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export function ScrollRestoration({ containerRef }: ScrollRestorationProps) {
  const location = useLocation();
  const previousPathRef = useRef<string | null>(null);
  const lastScrollPositionRef = useRef<number | null>(null);

  // Save scroll position when user scrolls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const currentPosition = container.scrollTop;
      scrollPositions.set(location.pathname, currentPosition);
      lastScrollPositionRef.current = currentPosition;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [location.pathname, containerRef]);

  // Restore scroll position when pathname changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const savedPosition = scrollPositions.get(location.pathname);
    if (savedPosition !== undefined && previousPathRef.current !== location.pathname) {
      // Only restore if the saved position is significantly different
      // This helps prevent small scroll adjustments
      if (Math.abs(savedPosition - container.scrollTop) > 5) {
        container.scrollTop = savedPosition;
      }
    }
  }, [location.pathname, containerRef]);

  // Update previous path
  useEffect(() => {
    previousPathRef.current = location.pathname;
  }, [location.pathname]);

  return null;
}

// Route error boundaries swallow render crashes, so the SDK never sees them
const reportRouteError: ClientOnErrorFunction = (error, { errorInfo }) => {
  if (Sentry.getClient()) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo?.componentStack } },
    });
  }
};

export function RouterProvider({ routes, prefix, errorElement, children }: RouterProviderProps) {
  // Memoize the router to avoid re-creating it on every render
  const router = useMemo(() => {
    // Ensure prefix has a leading slash and no double+ or trailing slashes
    const normalizedPrefix = `/${prefix?.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')}`;

    // Create a root route that wraps all routes with NavigationStackProvider
    // and any additional children (providers) so they have access to routing
    const rootRoute: RouteObject = {
      element: (
        <FeatureFlagOverridesRouteProvider>
          <NavigationStackProvider>{children}</NavigationStackProvider>
        </FeatureFlagOverridesRouteProvider>
      ),
      hydrateFallbackElement: <></>,
      children: routes.map((route) => ({
        ...route,
        errorElement: route.errorElement || errorElement || <ErrorPage />,
      })),
    };

    return createHashRouter([rootRoute], {
      basename: normalizedPrefix,
    });
  }, [routes, prefix, errorElement, children]);

  return <ReactRouterProvider router={router} onError={reportRouteError} />;
}

/**
 * Override the default navigate function to add the crossApp option. This is
 * used to determine if the navigate should be handled by the custom router, ie.
 * if we need to navigate outside of the current app in Ghost.
 */
export interface NavigateOptions extends ReactRouterNavigateOptions {
  crossApp?: boolean;
}

/**
 * Decides whether an in-router navigation to `pathname` (absolute, without the
 * router's basename) runs as a view transition. Apps provide one with
 * ViewTransitionControllerProvider; without one, navigations never transition.
 */
export interface ViewTransitionController {
  shouldTransition: (pathname: string) => boolean;
  /**
   * Runs before a transitioning navigation, which waits for the promise and is
   * dropped when it resolves false. Returning nothing navigates at once.
   */
  beforeTransition?: (pathname: string) => Promise<boolean> | undefined;
}

const ViewTransitionControllerContext = React.createContext<ViewTransitionController>({
  shouldTransition: () => false,
});

export const ViewTransitionControllerProvider = ViewTransitionControllerContext.Provider;

const ABSOLUTE_URL = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

/** Runs `navigate` after the controller's `beforeTransition`, when it has one. */
function navigateAfterTransitionStart(
  controller: ViewTransitionController,
  pathname: string,
  navigate: () => void,
): void {
  const ready = controller.beforeTransition?.(pathname);
  if (!ready) {
    navigate();
    return;
  }
  void ready.then((proceed) => {
    if (proceed) {
      navigate();
    }
  });
}

export function useNavigate() {
  const navigate = useReactRouterNavigate();
  const { externalNavigate } = useFramework();
  const controller = useContext(ViewTransitionControllerContext);
  const routePathname = useResolvedPath('.').pathname;
  const locationPathname = useLocation().pathname;

  // Read at call time so the returned function keeps its identity across navigations
  const pathnameFor = useRef<(to: string, relative?: RelativeRoutingType) => string>((to) => to);
  pathnameFor.current = (to, relative) =>
    resolvePath(to, relative === 'path' ? locationPathname : routePathname).pathname;

  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigate(to);
        return;
      }

      if (options?.crossApp) {
        externalNavigate({ route: to, isExternal: true, replace: options.replace });
        return;
      }

      const pathname = pathnameFor.current(to, options?.relative);
      if (options?.viewTransition === undefined && controller.shouldTransition(pathname)) {
        navigateAfterTransitionStart(controller, pathname, () =>
          navigate(to, { ...options, viewTransition: true }),
        );
        return;
      }

      navigate(to, options);
    },
    [controller, navigate, externalNavigate],
  );
}

function isPlainLeftClick(event: React.MouseEvent<HTMLAnchorElement>, target?: string): boolean {
  return (
    event.button === 0 &&
    (!target || target === '_self') &&
    !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
  );
}

/**
 * React Router's Link, which also runs as a view transition when the app's
 * ViewTransitionController asks for one and the caller has not set it.
 */
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { viewTransition, onClick, ...props },
  ref,
) {
  const controller = useContext(ViewTransitionControllerContext);
  const navigate = useReactRouterNavigate();
  const { pathname } = useResolvedPath(props.to, { relative: props.relative });
  const isAbsoluteUrl = typeof props.to === 'string' && ABSOLUTE_URL.test(props.to);
  const transitions =
    viewTransition ??
    (!isAbsoluteUrl && !props.reloadDocument && controller.shouldTransition(pathname));

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      !transitions ||
      viewTransition !== undefined ||
      !controller.beforeTransition ||
      event.defaultPrevented ||
      !isPlainLeftClick(event, props.target)
    ) {
      return;
    }
    // Take the click from React Router's own handler so the navigation can wait
    event.preventDefault();
    const { to, replace, state, preventScrollReset, relative } = props;
    navigateAfterTransitionStart(controller, pathname, () =>
      navigate(to, { replace, state, preventScrollReset, relative, viewTransition: true }),
    );
  };

  return (
    <ReactRouterLink
      ref={ref}
      {...props}
      viewTransition={transitions || undefined}
      onClick={handleClick}
    />
  );
});

export function useRouteHasParams() {
  const params = useParams();
  return params && Object.keys(params).length > 0;
}

interface CustomNavigateProps {
  to: string;
  replace?: boolean;
  state?: unknown;
  crossApp?: boolean;
}

export function Navigate({ to, replace, state, crossApp }: CustomNavigateProps) {
  const { externalNavigate } = useFramework();
  const lastExternalNavigation = useRef<{ replace?: boolean; to: string } | null>(null);

  useEffect(() => {
    if (!crossApp) {
      lastExternalNavigation.current = null;
      return;
    }

    const previousNavigation = lastExternalNavigation.current;
    if (previousNavigation?.to === to && previousNavigation.replace === replace) {
      return;
    }

    lastExternalNavigation.current = { replace, to };
    externalNavigate({ route: to, isExternal: true, replace });
  }, [crossApp, externalNavigate, replace, to]);

  if (crossApp) {
    return null;
  }

  return <ReactRouterNavigate replace={replace} state={state} to={to} />;
}
