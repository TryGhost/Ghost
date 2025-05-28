// Framework
export type {StatsConfig, FrameworkContextType, FrameworkProviderProps, TopLevelFrameworkProps} from './providers/FrameworkProvider';
export {FrameworkProvider, useFramework} from './providers/FrameworkProvider';

// Stats utilities
export {getStatEndpointUrl, getToken} from './utils/stats-config';

// Post utilities
export {hasBeenEmailed} from './utils/post-utils';

// Routing
export type {RouteObject} from 'react-router';
export type {RouterProviderProps} from './providers/RouterProvider';
export {RouterProvider, useNavigate, useBaseRoute, useRouteHasParams, resetScrollPosition, ScrollRestoration, Navigate} from './providers/RouterProvider';
export {useNavigationStack} from './providers/NavigationStackProvider';
export {Link, NavLink, Outlet, useLocation, useParams, useSearchParams, redirect, matchRoutes} from 'react-router';

// Data fetching
export type {InfiniteData} from '@tanstack/react-query';
export {useQueryClient} from '@tanstack/react-query';

// Testing utilities
export type {MockApiHookConfig} from './test/hook-testing-utils';
export {
    createMockApiReturn,
    mockApiHook,
    createMockApiHook,
    createLoadingMock,
    createErrorMock,
    createSuccessMock,
    mockDataFactories,
    waitForMockCall,
    waitForMockCalls,
    resetAllMocks,
    createTypedMockApiHook
} from './test/hook-testing-utils';
