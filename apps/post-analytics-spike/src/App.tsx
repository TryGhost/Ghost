import {PhantomApp, PhantomAppProps} from '@tryghost/phantom';
import {FrameworkProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {RoutingProvider} from '@tryghost/admin-x-framework/routing';
import PostAnalytics from './PostAnalytics';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: PhantomAppProps;
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
                <PhantomApp className='post-analytics-spike' {...designSystem}>
                    <PostAnalytics />
                </PhantomApp>
            </RoutingProvider>
        </FrameworkProvider>
    );
};

export default App;
