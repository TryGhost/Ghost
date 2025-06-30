import {APP_ROUTE_PREFIX, routes} from '@src/routes';
import {FeatureFlagsProvider} from './lib/feature-flags';
import {FrameworkProvider, Outlet, RouterProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {ShadeApp} from '@tryghost/shade';

interface AppProps {
    framework: TopLevelFrameworkProps;
    activityPubEnabled?: boolean;
}

const App: React.FC<AppProps> = ({framework, activityPubEnabled}) => {
    if (activityPubEnabled === false) {
        return null;
    }

    // In test mode, we use hash routing to avoid basename issues
    const routerProps = import.meta.env.VITE_TEST
        ? {prefix: '', hash: true, routes}
        : {prefix: APP_ROUTE_PREFIX, routes};

    return (
        <FrameworkProvider {...framework}>
            <RouterProvider {...routerProps}>
                <FeatureFlagsProvider>
                    <ShadeApp className="shade-activitypub" darkMode={false} fetchKoenigLexical={null}>
                        <Outlet />
                    </ShadeApp>
                </FeatureFlagsProvider>
            </RouterProvider>
        </FrameworkProvider>
    );
};

export default App;
