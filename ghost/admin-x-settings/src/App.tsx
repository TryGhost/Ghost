import Button from './admin-x-ds/global/Button';
import DataProvider from './components/providers/DataProvider';
import Heading from './admin-x-ds/global/Heading';
import NiceModal from '@ebay/nice-modal-react';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import {ServicesProvider} from './components/providers/ServiceProvider';
import {Toaster} from 'react-hot-toast';

interface AppProps {
    ghostVersion: string;
}

function App({ghostVersion}: AppProps) {
    return (
        <ServicesProvider ghostVersion={ghostVersion}>
            <DataProvider>
                <div className="admin-x-settings">
                    <Toaster />
                    <NiceModal.Provider>
                        <div className='fixed left-6 top-4'>
                            <Button label='&larr; Done' link={true} onClick={() => window.history.back()} />
                        </div>

                        {/* Main container */}
                        <div className="mx-auto flex max-w-[1080px] flex-col px-[5vmin] py-[12vmin] md:flex-row md:items-start md:gap-x-10 md:py-[8vmin]">

                            {/* Sidebar */}
                            <div className="relative min-w-[240px] grow-0 md:fixed md:top-[8vmin] md:basis-[240px]">
                                <div className='h-[84px]'>
                                    <Heading>Settings</Heading>
                                </div>
                                <div className="relative mt-[-32px] w-[240px] overflow-x-hidden after:absolute after:inset-x-0 after:top-0 after:block after:h-[40px] after:bg-gradient-to-b after:from-white after:to-transparent after:content-['']">
                                    <Sidebar />
                                </div>
                            </div>
                            <div className="flex-auto pt-[3vmin] md:ml-[280px] md:pt-[84px]">
                                <Settings />
                            </div>
                        </div>
                    </NiceModal.Provider>
                </div>
            </DataProvider>
        </ServicesProvider>
    );
}

export default App;
