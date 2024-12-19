import PostAnalytics from './pages/PostAnalytics';
import {FrameworkProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {RoutingProvider} from '@tryghost/admin-x-framework/routing';
import {ShadeApp, ShadeAppProps} from '@tryghost/shade';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: ShadeAppProps;
}

const App: React.FC<AppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider {...framework}>
            <RoutingProvider basePath='posts-x'>
                <ShadeApp className='posts' {...designSystem}>
                    <PostAnalytics />
                </ShadeApp>
            </RoutingProvider>
        </FrameworkProvider>
    );
};

export default App;
