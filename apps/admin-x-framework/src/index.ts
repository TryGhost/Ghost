// Framework
export type {StatsConfig, FrameworkContextType, FrameworkProviderProps, TopLevelFrameworkProps} from './providers/framework-provider';
export {FrameworkProvider, useFramework} from './providers/framework-provider';

// App Context
export type {AppSettings, BaseAppProps, AppContextType, AppProviderProps} from './providers/app-provider';
export {AppContext, AppProvider, useAppContext} from './providers/app-provider';

// Hooks
export {useActiveVisitors} from './hooks/use-active-visitors';
export {default as useForm} from './hooks/use-form';
export type {Dirtyable, ErrorMessages, FormHook, OkProps, SaveHandler, SaveState} from './hooks/use-form';
export {default as useHandleError} from './hooks/use-handle-error';
export {default as useFilterableApi} from './hooks/use-filterable-api';
export {useTinybirdToken} from './hooks/use-tinybird-token';
export type {UseTinybirdTokenResult} from './hooks/use-tinybird-token';
export {useTinybirdQuery} from './hooks/use-tinybird-query';
export type {UseTinybirdQueryOptions} from './hooks/use-tinybird-query';
export {useKoenigFileUpload, koenigFileUploadTypes} from './hooks/use-koenig-file-upload';
export type {KoenigFileUploadType} from './hooks/use-koenig-file-upload';

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
export type {RouterProviderProps, NavigateOptions} from './providers/router-provider';
export {RouterProvider, useNavigate, useBaseRoute, useRouteHasParams, resetScrollPosition, ScrollRestoration, Navigate} from './providers/router-provider';
export {useNavigationStack} from './providers/navigation-stack-provider';
export {Link, NavLink, Outlet, useLocation, useParams, useSearchParams, redirect, matchRoutes, matchPath, useMatch, useMatches} from 'react-router';

// Lazy component loader
export {lazyComponent} from './utils/lazy-component';

// Data fetching
export type {InfiniteData} from '@tanstack/react-query';
export {useQueryClient} from '@tanstack/react-query';

// API
export type {TinybirdToken, TinybirdTokenResponseType} from './api/tinybird';
export {getTinybirdToken} from './api/tinybird';
export type {FeaturebaseToken, FeaturebaseTokenResponseType} from './api/featurebase';
export {getFeaturebaseToken} from './api/featurebase';
