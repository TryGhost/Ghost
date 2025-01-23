import {APP_ROUTE_PREFIX, routes} from './routes';
import {FrameworkProvider, RouterProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {ShadeApp, ShadeAppProps, SidebarProvider} from '@tryghost/shade';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: ShadeAppProps;
}

const App: React.FC<AppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider {...framework}>
            <ShadeApp className='posts' {...designSystem}>
                <SidebarProvider>
                    <RouterProvider prefix={APP_ROUTE_PREFIX} routes={routes} />
                </SidebarProvider>
            </ShadeApp>
        </FrameworkProvider>
    );
};

export default App;
