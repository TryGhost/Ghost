import ExitSettingsButton from './components/ExitSettingsButton';
import GlobalDataProvider from './components/providers/GlobalDataProvider';
import MainContent from './MainContent';
import NiceModal from '@ebay/nice-modal-react';
import RoutingProvider, {ExternalLink} from './components/providers/RoutingProvider';
import clsx from 'clsx';
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
    darkMode?: boolean;
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

function App({ghostVersion, officialThemes, zapierTemplates, externalNavigate, darkMode = false}: AppProps) {
    const appClassName = clsx(
        'admin-x-settings h-[100vh] w-full overflow-y-auto',
        darkMode && 'dark'
    );

    return (
        <QueryClientProvider client={queryClient}>
            <ServicesProvider ghostVersion={ghostVersion} officialThemes={officialThemes} zapierTemplates={zapierTemplates}>
                <GlobalDataProvider>
                    <RoutingProvider externalNavigate={externalNavigate}>
                        <GlobalDirtyStateProvider>
                            <div className={appClassName} id="admin-x-root" style={{
                                height: '100vh',
                                width: '100%'
                            }}
                            >
                                <Toaster />
                                <NiceModal.Provider>
                                    <div className='relative z-20 px-6 py-4 tablet:fixed'>
                                        <ExitSettingsButton />
                                    </div>

                                    <div className="mx-auto flex max-w-[1080px] flex-col px-[5vmin] py-[12vmin] tablet:flex-row tablet:items-start tablet:gap-x-10 tablet:py-[8vmin]" id="admin-x-settings-content">
                                        <MainContent />
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
