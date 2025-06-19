import GlobalDataProvider from './providers/GlobalDataProvider';
import {APP_ROUTE_PREFIX, routes} from '@src/routes';
import {FrameworkProvider, Outlet, RouterProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {ShadeApp, ShadeAppProps} from '@tryghost/shade';
import {createContext, useContext} from 'react';

type AppSettingsType = {
    paidMembersEnabled: boolean;
}

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: ShadeAppProps;
    appSettings: AppSettingsType;
}

interface AppContextType {
    appSettings: AppSettingsType;
    externalNavigate: (url: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

const App: React.FC<AppProps> = ({framework, designSystem, appSettings}) => {
    const appContextValue: AppContextType = {
        appSettings,
        externalNavigate: (url: string) => {
            window.location.href = url;
        }
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
            <AppContext.Provider value={appContextValue}>
                <RouterProvider prefix={APP_ROUTE_PREFIX} routes={routes}>
                    <GlobalDataProvider>
                        <ShadeApp darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                            <Outlet />
                        </ShadeApp>
                    </GlobalDataProvider>
                </RouterProvider>
            </AppContext.Provider>
        </FrameworkProvider>
    );
};

export default App;
