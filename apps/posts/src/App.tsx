import PostsAppContextProvider, {PostsAppContextType} from './providers/PostsAppContext';
import PostsErrorBoundary from './components/errors/PostsErrorBoundary';
import React from 'react';
import {APP_ROUTE_PREFIX, routes} from '@src/routes';
import {BaseAppProps, FrameworkProvider, Outlet, RouterProvider} from '@tryghost/admin-x-framework';
import {ShadeApp} from '@tryghost/shade';

interface AppProps extends BaseAppProps {
    fromAnalytics?: boolean;
}

const App: React.FC<AppProps> = ({framework, designSystem, fromAnalytics = false, appSettings}) => {
    const appContextValue: PostsAppContextType = {
        appSettings,
        externalNavigate: (url: string) => {
            window.location.href = url;
        },
        fromAnalytics
    };

    return (
        <FrameworkProvider
            {...framework}
            queryClientOptions={{
                staleTime: 0, // Always consider data stale (matches Ember admin route behavior)
                refetchOnMount: true, // Always refetch when component mounts (matches Ember route model)
                refetchOnWindowFocus: false // Disable window focus refetch (Ember admin doesn't have this)
            }}
        >
            <PostsAppContextProvider value={appContextValue}>
                <RouterProvider prefix={APP_ROUTE_PREFIX} routes={routes}>
                    <PostsErrorBoundary>
                        <ShadeApp className="shade-posts" darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                            <Outlet />
                        </ShadeApp>
                    </PostsErrorBoundary>
                </RouterProvider>
            </PostsAppContextProvider>
        </FrameworkProvider>
    );
};

export default App;
