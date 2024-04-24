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
                    <div className='mx-auto my-0 w-full max-w-3xl p-12'>
                        <h1 className='mb-6 text-black'>ActivityPub Demo</h1>
                        <div className='flex flex-col'>
                            <div className='mb-4 flex flex-col'>
                                <h2 className='mb-2 text-2xl text-black'>This is a post title</h2>
                                <p className='mb-2 text-lg text-grey-950'>This is some very short post content</p>
                                <p className='text-md text-grey-700'>Publish McPublisher</p>
                            </div>
                            <div className='mb-4 flex flex-col'>
                                <h2 className='mb-2 text-2xl text-black'>This is a post title</h2>
                                <p className='mb-2 text-lg text-grey-950'>This is some very short post content</p>
                                <p className='text-md text-grey-700'>Publish McPublisher</p>
                            </div>
                            <div className='mb-4 flex flex-col'>
                                <h2 className='mb-2 text-2xl text-black'>This is a post title</h2>
                                <p className='mb-2 text-lg text-grey-950'>This is some very short post content</p>
                                <p className='text-md text-grey-700'>Publish McPublisher</p>
                            </div>
                        </div>
                    </div>
                </DesignSystemApp>
            </RoutingProvider>
        </FrameworkProvider>
    );
};

export default App;
