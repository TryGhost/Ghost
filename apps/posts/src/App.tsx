import PostsErrorBoundary from './components/errors/PostsErrorBoundary';
import React, {createContext, useContext} from 'react';
import {APP_ROUTE_PREFIX, routes} from '@src/routes';
import {AppContextType, BaseAppProps, FrameworkProvider, Outlet, RouterProvider} from '@tryghost/admin-x-framework';
import {ShadeApp} from '@tryghost/shade';

interface PostsAppContextType extends AppContextType {
    fromAnalytics: boolean;
}

const PostsAppContext = createContext<PostsAppContextType | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(PostsAppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

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
            <PostsAppContext.Provider value={appContextValue}>
                <RouterProvider prefix={APP_ROUTE_PREFIX} routes={routes}>
                    <PostsErrorBoundary>
                        <ShadeApp className="shade-posts" darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                            <Outlet />
                        </ShadeApp>
                    </PostsErrorBoundary>
                </RouterProvider>
            </PostsAppContext.Provider>
        </FrameworkProvider>
    );
};

export default App;
