import MainContent from './MainContent';
import {DesignSystemApp, DesignSystemAppProps} from '@tryghost/admin-x-design-system';
import {FrameworkProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {RoutingProvider} from '@tryghost/admin-x-framework/routing';
import {ShadeApp} from '@tryghost/shade';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: DesignSystemAppProps;
}

const App: React.FC<AppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider {...framework}>
            <RoutingProvider basePath='activitypub'>
                <DesignSystemApp className='shade' {...designSystem}>
                    <ShadeApp darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                        <MainContent />
                    </ShadeApp>
                </DesignSystemApp>
            </RoutingProvider>
        </FrameworkProvider>
    );
};

export default App;
