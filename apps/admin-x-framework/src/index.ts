// Framework
export type {StatsConfig, TopLevelFrameworkProps} from './providers/framework-provider';
export {FrameworkProvider, useFramework} from './providers/framework-provider';

// App Context
export type {AppSettings, AppContextType} from './providers/app-provider';
export {AppContext, AppProvider, useAppContext, useWebAnalyticsEnabled} from './providers/app-provider';

// Hooks
export {useActiveVisitors} from './hooks/use-active-visitors';
export {useConfirmUnload} from './hooks/use-confirm-unload';
export {default as useForm} from './hooks/use-form';
export type {Dirtyable, ErrorMessages, OkProps, SaveHandler, SaveState} from './hooks/use-form';
export {default as useHandleError} from './hooks/use-handle-error';
export {default as useFilterableApi} from './hooks/use-filterable-api';
export {useTinybirdToken} from './hooks/use-tinybird-token';
export type {UseTinybirdTokenResult} from './hooks/use-tinybird-token';
export {useTinybirdQuery} from './hooks/use-tinybird-query';
export type {UseTinybirdQueryOptions} from './hooks/use-tinybird-query';
export {useKoenigFileUpload, koenigFileUploadTypes} from './hooks/use-koenig-file-upload';
export {useKoenigFetchEmbed} from './hooks/use-koenig-fetch-embed';
export {useKoenigLinkSuggestions} from './hooks/use-koenig-link-suggestions';
export {useFeaturebase} from './hooks/use-featurebase';

// Analytics utilities
export {trackEvent, trackFilterApplications} from './utils/analytics';

// Currency utilities
export {currencies, currencyFromDecimal, currencyGroups, currencySelectGroups, currencyToDecimal, getSymbol, minimumAmountForCurrency, validateCurrencyAmount} from './utils/currency';
export type {CurrencySelectOptionGroup} from './utils/currency';

// Post utilities
export type {Post} from './api/posts';
export {hasBeenEmailed} from './utils/post-utils';
export {isEmailOnly, isPublishedOnly, isPublishedAndEmailed, getPostMetricsToDisplay} from './utils/post-helpers';
export {focusKoenigEditorOnBottomClick} from './utils/focus-koenig-editor-on-bottom-click';

// Source utilities
export {getFaviconDomain, processSources, extendSourcesWithPercentages} from './utils/source-utils';
export type {BaseSourceData, ProcessedSourceData} from './utils/source-utils';

// Routing
export type {RouteObject} from 'react-router';
export type {NavigateOptions} from './providers/router-provider';
export type AdminRouteHandle = {
    allowInForceUpgrade?: boolean;
    hideAdminSidebar?: boolean;
};
export {RouterProvider, useNavigate, useRouteHasParams, resetScrollPosition, ScrollRestoration, Navigate} from './providers/router-provider';
export {useNavigationStack} from './providers/navigation-stack-provider';
export {Link, Outlet, useBlocker, useLocation, useParams, useRouteError, useSearchParams, redirect, matchRoutes, useMatch, useMatches} from 'react-router';

// Lazy component loader
export {lazyComponent} from './utils/lazy-component';

// Data fetching
export type {InfiniteData} from '@tanstack/react-query';
export {useQueryClient} from '@tanstack/react-query';
