import {DesignSystemApp, DesignSystemAppProps} from '@tryghost/admin-x-design-system';
import {FrameworkProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {RoutingProvider} from '@tryghost/admin-x-framework/routing';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: DesignSystemAppProps;
}

const App: React.FC<AppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider {...framework}>
            <RoutingProvider basePath='playground-x'>
                <DesignSystemApp className='admin-x-playground' {...designSystem}>
                    <h1>Hello from Admin X React 🧪</h1>
                </DesignSystemApp>
            </RoutingProvider>
        </FrameworkProvider>
    );
};

export default App;
