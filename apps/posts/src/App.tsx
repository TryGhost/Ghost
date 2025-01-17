import PostAnalytics from './views/post-analytics/PostAnalytics';
import {FrameworkProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {RoutingProvider} from '@tryghost/admin-x-framework/routing';
import {ShadeApp, ShadeAppProps, SidebarProvider} from '@tryghost/shade';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: ShadeAppProps;
}

const App: React.FC<AppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider {...framework}>
            <RoutingProvider basePath='posts-x'>
                <ShadeApp className='posts' {...designSystem}>
                    <SidebarProvider>
                        <PostAnalytics />
                    </SidebarProvider>
                </ShadeApp>
            </RoutingProvider>
        </FrameworkProvider>
    );
};

export default App;
