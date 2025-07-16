import GlobalDataProvider from './providers/GlobalDataProvider';
import React from 'react';
import StatsErrorPage from './components/errors/StatsErrorPage';
import {APP_ROUTE_PREFIX, routes} from '@src/routes';
import {AppProvider, BaseAppProps, FrameworkProvider, Outlet, RouterProvider} from '@tryghost/admin-x-framework';
import {ShadeApp} from '@tryghost/shade';

export {useAppContext} from '@tryghost/admin-x-framework';

class StatsErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
    constructor(props: {children: React.ReactNode}) {
        super(props);
        this.state = {hasError: false};
    }

    static getDerivedStateFromError(error: Error) {
        return {hasError: true, error};
    }

    render() {
        if (this.state.hasError) {
            return <StatsErrorPage error={this.state.error} />;
        }
        return this.props.children;
    }
}

const App: React.FC<BaseAppProps> = ({framework, designSystem, appSettings}) => {
    return (
        <FrameworkProvider
            {...framework}
            queryClientOptions={{
                staleTime: 0, // Always consider data stale (matches Ember admin route behavior)
                refetchOnMount: true, // Always refetch when component mounts (matches Ember route model)
                refetchOnWindowFocus: false // Disable window focus refetch (Ember admin doesn't have this)
            }}
        >
            <AppProvider appSettings={appSettings}>
                <RouterProvider errorElement={<StatsErrorPage />} prefix={APP_ROUTE_PREFIX} routes={routes}>
                    <StatsErrorBoundary>
                        <GlobalDataProvider>
                            <ShadeApp className="shade-stats" darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                                <Outlet />
                            </ShadeApp>
                        </GlobalDataProvider>
                    </StatsErrorBoundary>
                </RouterProvider>
            </AppProvider>
        </FrameworkProvider>
    );
};

export default App;
