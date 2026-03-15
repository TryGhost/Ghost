import {FeatureFlagsProvider} from './lib/feature-flags';
import {FrameworkProvider, Outlet, RouterProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {ShadeApp} from '@tryghost/shade';
import {routes} from '@src/routes';

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
            <RouterProvider prefix={'/'} routes={routes}>
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
