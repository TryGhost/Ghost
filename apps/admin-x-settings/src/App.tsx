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
                                    <MainContent />
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
