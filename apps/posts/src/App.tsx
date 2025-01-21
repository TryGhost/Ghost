import {FrameworkProvider, TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {RouterProvider} from 'react-router';
import {ShadeApp, ShadeAppProps, SidebarProvider} from '@tryghost/shade';
import {router} from './routes';

interface AppProps {
    framework: TopLevelFrameworkProps;
    designSystem: ShadeAppProps;
}

const App: React.FC<AppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider {...framework}>
            <ShadeApp className='posts' {...designSystem}>
                <SidebarProvider>
                    <RouterProvider router={router} />
                </SidebarProvider>
            </ShadeApp>
        </FrameworkProvider>
    );
};

export default App;
