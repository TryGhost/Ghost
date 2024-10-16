import MainContent from './MainContent';
import {DesignSystemApp, DesignSystemAppProps} from '@tryghost/admin-x-design-system';
import {FrameworkProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {RoutingProvider} from '@tryghost/admin-x-framework/routing';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: DesignSystemAppProps;
}

const modals = {
    paths: {
        'follow-site': 'FollowSite',
        'profile/following': 'ViewFollowing',
        'profile/followers': 'ViewFollowers'
    },
    load: async () => import('./components/modals')
};

const App: React.FC<AppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider {...framework}>
            <RoutingProvider basePath='activitypub' modals={modals}>
                <DesignSystemApp className='admin-x-activitypub' {...designSystem}>
                    <MainContent />
                </DesignSystemApp>
            </RoutingProvider>
        </FrameworkProvider>
    );
};

export default App;