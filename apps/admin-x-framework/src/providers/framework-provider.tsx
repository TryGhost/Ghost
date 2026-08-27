import { ErrorBoundary as SentryErrorBoundary } from '@sentry/react';
import {
  Query,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  QueryErrorResetBoundary,
} from '@tanstack/react-query';
import { ReactNode, createContext, useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { handleFrameworkError } from '../utils/handle-error';
import queryClient from '../utils/query-client';

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      defaultErrorHandler?: boolean;
    };
  }
}

export type ExternalLink = {
  isExternal: true;
  route: string;
  models?: string[] | null;
  replace?: boolean;
};

export type InternalLink = {
  isExternal?: false;
  route: string;
  replace?: boolean;
};

// Stats-specific configuration
export interface StatsConfig {
  endpoint?: string;
  endpointBrowser?: string;
  id?: string;
  token?: string;
  version?: string;
  local?: {
    enabled?: boolean;
    endpoint?: string;
    token?: string;
  };
}

export interface FrameworkProviderProps {
  ghostVersion: string;
  externalNavigate: (link: ExternalLink) => void;
  unsplashConfig: {
    Authorization: string;
    'Accept-Version': string;
    'Content-Type': string;
    'App-Pragma': string;
    'X-Unsplash-Cache': boolean;
  };
  sentryDSN: string | null;
  onUpdate: (dataType: string, response: unknown) => void;
  onInvalidate: (dataType: string) => void;
  onDelete: (dataType: string, id: string) => void;

  // Optional QueryClient override. Defaults to the shared window-level
  // singleton; test harnesses pass a fresh client per render for isolation.
  queryClient?: QueryClient;

  children: ReactNode;
}

export type TopLevelFrameworkProps = Omit<FrameworkProviderProps, 'children'>;

export type FrameworkContextType = Omit<FrameworkProviderProps, 'children'>;

// Ghost's registered Unsplash application; the Client-ID is a public API key
export const defaultUnsplashConfig: FrameworkProviderProps['unsplashConfig'] = {
  Authorization: 'Client-ID 8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980',
  'Accept-Version': 'v1',
  'Content-Type': 'application/json',
  'App-Pragma': 'no-cache',
  'X-Unsplash-Cache': true,
};

const FrameworkContext = createContext<FrameworkContextType>({
  ghostVersion: '',
  externalNavigate: () => {},
  unsplashConfig: {
    Authorization: '',
    'Accept-Version': '',
    'Content-Type': '',
    'App-Pragma': '',
    'X-Unsplash-Cache': true,
  },
  sentryDSN: null,
  onUpdate: () => {},
  onInvalidate: () => {},
  onDelete: () => {},
});

type QueryErrorHandler = (
  error: unknown,
  query: Query<unknown, unknown, unknown, readonly unknown[]>,
) => void;
type QueryCacheRegistration = {
  handlers: Map<symbol, QueryErrorHandler>;
  originalHandler: QueryCache['config']['onError'];
};

const queryCacheRegistrations = new WeakMap<QueryCache, QueryCacheRegistration>();

function registerQueryErrorHandler(cache: QueryCache, token: symbol, handler: QueryErrorHandler) {
  let registration = queryCacheRegistrations.get(cache);

  if (!registration) {
    registration = {
      handlers: new Map(),
      originalHandler: cache.config.onError,
    };
    queryCacheRegistrations.set(cache, registration);

    cache.config.onError = (error, query) => {
      registration?.originalHandler?.(error, query);
      registration?.handlers.forEach((registeredHandler) => registeredHandler(error, query));
    };
  }

  registration.handlers.set(token, handler);
}

function unregisterQueryErrorHandler(cache: QueryCache, token: symbol) {
  const registration = queryCacheRegistrations.get(cache);
  if (!registration) {
    return;
  }

  registration.handlers.delete(token);
  if (registration.handlers.size === 0) {
    cache.config.onError = registration.originalHandler;
    queryCacheRegistrations.delete(cache);
  }
}

export function FrameworkProvider({
  children,
  queryClient: queryClientOverride,
  ...props
}: FrameworkProviderProps) {
  const client = useMemo(() => {
    if (queryClientOverride) {
      return queryClientOverride;
    }

    return queryClient;
  }, [queryClientOverride]);

  const queryErrorHandlerToken = useRef(Symbol('framework-query-error-handler')).current;
  const cache = client.getQueryCache();
  useLayoutEffect(() => {
    registerQueryErrorHandler(cache, queryErrorHandlerToken, (error, query) => {
      // Query.meta only reflects the observer that updated the shared entry
      // last. Aggregate active observer policies for mixed progressive and
      // Suspense reads; imperative reads fall back to the query's own meta.
      const observerPolicies = query.observers.map(
        (observer) => observer.options.meta?.defaultErrorHandler,
      );
      const shouldHandle =
        observerPolicies.some((policy) => policy === true) ||
        (observerPolicies.length === 0 && query.meta?.defaultErrorHandler === true);

      if (shouldHandle) {
        handleFrameworkError(error, { sentryDSN: props.sentryDSN });
      }
    });

    return () => unregisterQueryErrorHandler(cache, queryErrorHandlerToken);
  }, [cache, props.sentryDSN, queryErrorHandlerToken]);

  return (
    <SentryErrorBoundary>
      <QueryClientProvider client={client}>
        <QueryErrorResetBoundary>
          <FrameworkContext.Provider value={props}>{children}</FrameworkContext.Provider>
        </QueryErrorResetBoundary>
      </QueryClientProvider>
    </SentryErrorBoundary>
  );
}

export const useFramework = () => useContext(FrameworkContext);
