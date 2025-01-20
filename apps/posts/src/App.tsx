import PostAnalytics from './views/post-analytics/PostAnalytics';
import {FrameworkProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {RouterProvider, createHashRouter} from 'react-router';
// import {RoutingProvider} from '@tryghost/admin-x-framework/routing';
import {ShadeApp, ShadeAppProps, SidebarProvider} from '@tryghost/shade';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: ShadeAppProps;
}

// TODO: should be in a routing wrapper
const basePath = 'posts-x';
const router = createHashRouter([
    {
        path: `${basePath}/analytics/:postId`,
        element: <PostAnalytics />
    }
]);

const App: React.FC<AppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider {...framework}>
            <ShadeApp className='posts' {...designSystem}>
                <SidebarProvider>
                    <RouterProvider router={router} />
                </SidebarProvider>
            </ShadeApp>
        </FrameworkProvider>
    );
};

export default App;
