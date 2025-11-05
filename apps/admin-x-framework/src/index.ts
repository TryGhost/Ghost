// Framework
export type {StatsConfig, FrameworkContextType, FrameworkProviderProps, TopLevelFrameworkProps} from './providers/FrameworkProvider';
export {FrameworkProvider, useFramework} from './providers/FrameworkProvider';

// App Context
export type {AppSettings, BaseAppProps, AppContextType, AppProviderProps} from './providers/AppProvider';
export {AppContext, AppProvider, useAppContext} from './providers/AppProvider';

// Hooks
export {useActiveVisitors} from './hooks/useActiveVisitors';
export {default as useForm} from './hooks/useForm';
export type {Dirtyable, ErrorMessages, FormHook, OkProps, SaveHandler, SaveState} from './hooks/useForm';
export {default as useHandleError} from './hooks/useHandleError';
export {default as useFilterableApi} from './hooks/useFilterableApi';
export {useTinybirdToken} from './hooks/useTinybirdToken';
export type {UseTinybirdTokenResult} from './hooks/useTinybirdToken';
export {useTinybirdQuery} from './hooks/useTinybirdQuery';
export type {UseTinybirdQueryOptions} from './hooks/useTinybirdQuery';

// Currency utilities
export {getSymbol} from './utils/currency';

// Stats utilities
export {getStatEndpointUrl, getToken} from './utils/stats-config';

// Post utilities
export type {Post} from './api/posts';
export {hasBeenEmailed} from './utils/post-utils';
export {isEmailOnly, isPublishedOnly, isPublishedAndEmailed, getPostMetricsToDisplay} from './utils/post-helpers';

// Source utilities
export {SOURCE_DOMAIN_MAP, getFaviconDomain, extractDomain, isDomainOrSubdomain, processSources, extendSourcesWithPercentages, normalizeSource} from './utils/source-utils';
export type {BaseSourceData, ProcessedSourceData, ExtendSourcesOptions} from './utils/source-utils';

// Routing
export type {RouteObject} from 'react-router';
export type {RouterProviderProps, NavigateOptions} from './providers/RouterProvider';
export {RouterProvider, useNavigate, useBaseRoute, useRouteHasParams, resetScrollPosition, ScrollRestoration, Navigate} from './providers/RouterProvider';
export {useNavigationStack} from './providers/NavigationStackProvider';
export {Link, NavLink, Outlet, useLocation, useParams, useSearchParams, redirect, matchRoutes, useMatches} from 'react-router';

// Data fetching
export type {InfiniteData} from '@tanstack/react-query';
export {useQueryClient} from '@tanstack/react-query';

// API
export type {TinybirdToken, TinybirdTokenResponseType} from './api/tinybird';
export {getTinybirdToken} from './api/tinybird';
