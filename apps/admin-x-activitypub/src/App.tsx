import {APP_ROUTE_PREFIX, routes} from '@src/routes';
import {DesignSystemApp, DesignSystemAppProps} from '@tryghost/admin-x-design-system';
import {FeatureFlagsProvider} from './lib/feature-flags';
import {FrameworkProvider, Outlet, RouterProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {ShadeApp} from '@tryghost/shade';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: DesignSystemAppProps;
    activityPubEnabled?: boolean;
}

const App: React.FC<AppProps> = ({framework, designSystem, activityPubEnabled}) => {
    if (activityPubEnabled === false) {
        return null;
    }

    return (
        <FrameworkProvider {...framework}>
            <RouterProvider prefix={APP_ROUTE_PREFIX} routes={routes}>
                <FeatureFlagsProvider>
                    <DesignSystemApp className='shade' {...designSystem}>
                        {/* TODO: remove className='' from ShadeApp once DesignSystemApp is removed to apply 'shade' to the main container */}
                        <ShadeApp className='' darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                            <Outlet />
                        </ShadeApp>
                    </DesignSystemApp>
                </FeatureFlagsProvider>
            </RouterProvider>
        </FrameworkProvider>
    );
};

export default App;
