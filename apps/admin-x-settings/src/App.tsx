import ExitSettingsButton from './components/ExitSettingsButton';
import GlobalDataProvider from './components/providers/GlobalDataProvider';
import Heading from './admin-x-ds/global/Heading';
import NiceModal from '@ebay/nice-modal-react';
import RoutingProvider, {ExternalLink} from './components/providers/RoutingProvider';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import {GlobalDirtyStateProvider} from './hooks/useGlobalDirtyState';
import {OfficialTheme, ServicesProvider} from './components/providers/ServiceProvider';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Toaster} from 'react-hot-toast';
import {ZapierTemplate} from './components/settings/advanced/integrations/ZapierModal';

interface AppProps {
    ghostVersion: string;
    officialThemes: OfficialTheme[];
    zapierTemplates: ZapierTemplate[];
    externalNavigate: (link: ExternalLink) => void;
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 5 * (60 * 1000), // 5 mins
            cacheTime: 10 * (60 * 1000) // 10 mins
        }
    }
});

function App({ghostVersion, officialThemes, zapierTemplates, externalNavigate}: AppProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <ServicesProvider ghostVersion={ghostVersion} officialThemes={officialThemes} zapierTemplates={zapierTemplates}>
                <GlobalDataProvider>
                    <RoutingProvider externalNavigate={externalNavigate}>
                        <GlobalDirtyStateProvider>
                            <div className="admin-x-settings h-[100vh] w-full overflow-y-auto" id="admin-x-root" style={{
                                height: '100vh',
                                width: '100%'
                            }}
                            >
                                <Toaster />
                                <NiceModal.Provider>
                                    <div className='relative z-20 px-6 py-4 tablet:fixed'>
                                        <ExitSettingsButton />
                                    </div>

                                    {/* Main container */}
                                    <div className="mx-auto flex max-w-[1080px] flex-col px-[5vmin] py-[12vmin] tablet:flex-row tablet:items-start tablet:gap-x-10 tablet:py-[8vmin]" id="admin-x-settings-content">

                                        {/* Sidebar */}
                                        <div className="sticky top-[-42px] z-20 min-w-[260px] grow-0 md:top-[-52px] tablet:fixed tablet:top-[8vmin] tablet:basis-[260px]">
                                            <div className='h-[84px]'>
                                                <Heading>Settings</Heading>
                                            </div>
                                            <div className="relative mt-[-32px] w-full overflow-x-hidden after:absolute after:inset-x-0 after:top-0 after:hidden after:h-[40px] after:bg-gradient-to-b after:from-white after:to-transparent after:content-[''] tablet:w-[260px] tablet:after:!visible tablet:after:!block">
                                                <Sidebar />
                                            </div>
                                        </div>
                                        <div className="relative flex-auto pt-[3vmin] tablet:ml-[300px] tablet:pt-[85px]">
                                            <div className='pointer-events-none fixed inset-x-0 top-0 z-[5] h-[80px] bg-gradient-to-t from-transparent to-white to-60%'></div>
                                            <Settings />
                                        </div>
                                    </div>
                                </NiceModal.Provider>
                            </div>
                        </GlobalDirtyStateProvider>
                    </RoutingProvider>
                </GlobalDataProvider>
            </ServicesProvider>
        </QueryClientProvider>
    );
}

export default App;
