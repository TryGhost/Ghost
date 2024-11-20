import MainContent from './MainContent';
import NewPostModal from './components/modals/NewPostModal';
import NiceModal from '@ebay/nice-modal-react';
import {DesignSystemApp, DesignSystemAppProps} from '@tryghost/admin-x-design-system';
import {FrameworkProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {RoutingProvider} from '@tryghost/admin-x-framework/routing';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: DesignSystemAppProps;
}

const App: React.FC<AppProps> = ({framework, designSystem}) => {
    NiceModal.register('NewPostModal', NewPostModal);

    return (
        <FrameworkProvider {...framework}>
            <RoutingProvider basePath='activitypub'>
                <DesignSystemApp className='admin-x-activitypub' {...designSystem}>
                    <MainContent />
                </DesignSystemApp>
            </RoutingProvider>
        </FrameworkProvider>
    );
};

export default App;
