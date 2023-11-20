import MainContent from './MainContent';
import {DesignSystemApp, DesignSystemAppProps} from '@tryghost/admin-x-design-system';
import {FrameworkProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';

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
        <FrameworkProvider basePath='demo-x' modals={modals} {...framework}>
            <DesignSystemApp className='admin-x-demo' {...designSystem}>
                <MainContent />
            </DesignSystemApp>
        </FrameworkProvider>
    );
};

export default App;
