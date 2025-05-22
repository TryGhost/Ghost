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

    return (
        <FrameworkProvider {...framework}>
            <RouterProvider prefix={APP_ROUTE_PREFIX} routes={routes}>
                <FeatureFlagsProvider>
                    <ShadeApp fetchKoenigLexical={null}>
                        <Outlet />
                    </ShadeApp>
                </FeatureFlagsProvider>
            </RouterProvider>
        </FrameworkProvider>
    );
};

export default App;
