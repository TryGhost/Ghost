import GlobalDataProvider from './providers/GlobalDataProvider';
import {APP_ROUTE_PREFIX, routes} from '@src/routes';
import {FrameworkProvider, Outlet, RouterProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {ShadeApp, ShadeAppProps} from '@tryghost/shade';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: ShadeAppProps;
}

const App: React.FC<AppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider 
            {...framework}
            queryClientOptions={{
                staleTime: 0, // Always consider data stale (matches Ember admin route behavior)
                refetchOnMount: true, // Always refetch when component mounts (matches Ember route model)
                refetchOnWindowFocus: false // Disable window focus refetch (Ember admin doesn't have this)
            }}
        >
            <RouterProvider prefix={APP_ROUTE_PREFIX} routes={routes}>
                <GlobalDataProvider>
                    <ShadeApp darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                        <Outlet />
                    </ShadeApp>
                </GlobalDataProvider>
            </RouterProvider>
        </FrameworkProvider>
    );
};

export default App;
