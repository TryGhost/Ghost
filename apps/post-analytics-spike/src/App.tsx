import {DesignSystemApp, DesignSystemAppProps} from '@tryghost/admin-x-design-system';
import {FrameworkProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {RoutingProvider} from '@tryghost/admin-x-framework/routing';
import PostAnalytics from './PostAnalytics';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: DesignSystemAppProps;
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
                <DesignSystemApp className='post-analytics-spike' {...designSystem}>
                    <PostAnalytics />
                </DesignSystemApp>
            </RoutingProvider>
        </FrameworkProvider>
    );
};

export default App;
