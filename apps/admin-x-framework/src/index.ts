// Framework
export type {StatsConfig, FrameworkContextType, FrameworkProviderProps, TopLevelFrameworkProps} from './providers/FrameworkProvider';
export {FrameworkProvider, useFramework} from './providers/FrameworkProvider';

// App Context
export type {AppSettings, BaseAppProps, AppContextType, AppProviderProps} from './providers/AppProvider';
export {AppProvider, useAppContext} from './providers/AppProvider';

// Analytics
export type {AnalyticsFeatures} from './hooks/useAnalyticsFeatures';
export {useAnalyticsFeatures} from './hooks/useAnalyticsFeatures';
export {useActiveVisitors} from './hooks/useActiveVisitors';

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
export type {RouterProviderProps} from './providers/RouterProvider';
export {RouterProvider, useNavigate, useBaseRoute, useRouteHasParams, resetScrollPosition, ScrollRestoration, Navigate} from './providers/RouterProvider';
export {useNavigationStack} from './providers/NavigationStackProvider';
export {Link, NavLink, Outlet, useLocation, useParams, useSearchParams, redirect, matchRoutes} from 'react-router';

// Data fetching
export type {InfiniteData} from '@tanstack/react-query';
export {useQueryClient} from '@tanstack/react-query';
