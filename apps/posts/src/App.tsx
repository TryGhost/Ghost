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
            <RoutingProvider basePath='posts-r'>
                <ShadeApp className='posts' {...designSystem}>
                    YOUR CONTENT HERE
                </ShadeApp>
            </RoutingProvider>
        </FrameworkProvider>
    );
};

export default App;