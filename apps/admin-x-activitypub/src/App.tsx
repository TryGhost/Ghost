import {APP_ROUTE_PREFIX, routes} from '@src/routes';
import {DesignSystemApp, DesignSystemAppProps} from '@tryghost/admin-x-design-system';
import {FeatureFlagsProvider} from './lib/feature-flags';
import {FrameworkProvider, Outlet, RouterProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {ShadeApp} from '@tryghost/shade';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: DesignSystemAppProps;
}

const App: React.FC<AppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider {...framework}>
            <DesignSystemApp className='shade' {...designSystem}>
                <ShadeApp darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                    <RouterProvider prefix={APP_ROUTE_PREFIX} routes={routes}>
                        <FeatureFlagsProvider>
                            <Outlet />
                        </FeatureFlagsProvider>
                    </RouterProvider>
                </ShadeApp>
            </DesignSystemApp>
        </FrameworkProvider>
    );
};

export default App;
