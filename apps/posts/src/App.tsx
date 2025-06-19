import React, {createContext, useContext} from 'react';
import {APP_ROUTE_PREFIX, routes} from '@src/routes';
import {FrameworkProvider, Outlet, RouterProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {ShadeApp, ShadeAppProps} from '@tryghost/shade';

type AppSettingsType = {
    paidMembersEnabled: boolean;
}

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: ShadeAppProps;
    fromAnalytics?: boolean;
    appSettings?: AppSettingsType;
}

interface AppContextType {
    fromAnalytics: boolean;
    appSettings?: AppSettingsType;
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

const App: React.FC<AppProps> = ({framework, designSystem, fromAnalytics = false, appSettings}) => {
    const appContextValue: AppContextType = {
        fromAnalytics,
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
                    <ShadeApp darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                        <Outlet />
                    </ShadeApp>
                </RouterProvider>
            </AppContext.Provider>
        </FrameworkProvider>
    );
};

export default App;
