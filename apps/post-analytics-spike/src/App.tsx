import {ShadeApp, ShadeAppProps} from '@tryghost/shade';
import {FrameworkProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {RoutingProvider} from '@tryghost/admin-x-framework/routing';
import PostAnalytics from './PostAnalytics';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: ShadeAppProps;
}

const modals = {
    paths: {
        'demo-modal': 'DemoModal'
    },
    load: async () => import('./components/modals')
};

const App: React.FC<AppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider {...framework}>
            <RoutingProvider basePath='post-analytics-spike' modals={modals}>
                <ShadeApp className='post-analytics-spike' {...designSystem}>
                    <PostAnalytics />
                </ShadeApp>
            </RoutingProvider>
        </FrameworkProvider>
    );
};

export default App;
