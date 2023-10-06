import DesignSystemProvider from './admin-x-ds/providers/DesignSystemProvider';
import GlobalDataProvider from './components/providers/GlobalDataProvider';
import MainContent from './MainContent';
import NiceModal from '@ebay/nice-modal-react';
import RoutingProvider, {ExternalLink} from './components/providers/RoutingProvider';
import clsx from 'clsx';
import {DefaultHeaderTypes} from './utils/unsplash/UnsplashTypes';
import {FetchKoenigLexical, OfficialTheme, ServicesProvider} from './components/providers/ServiceProvider';
import {GlobalDirtyStateProvider} from './hooks/useGlobalDirtyState';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ErrorBoundary as SentryErrorBoundary} from '@sentry/react';
import {Toaster} from 'react-hot-toast';
import {ZapierTemplate} from './components/settings/advanced/integrations/ZapierModal';

interface AppProps {
    ghostVersion: string;
    officialThemes: OfficialTheme[];
    zapierTemplates: ZapierTemplate[];
    externalNavigate: (link: ExternalLink) => void;
    darkMode?: boolean;
    unsplashConfig: DefaultHeaderTypes
    sentryDSN: string | null;
    fetchKoenigLexical: FetchKoenigLexical;
    onUpdate: (dataType: string, response: unknown) => void;
    onInvalidate: (dataType: string) => void;
    onDelete: (dataType: string, id: string) => void;
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 5 * (60 * 1000), // 5 mins
            cacheTime: 10 * (60 * 1000), // 10 mins
            // We have custom retry logic for specific errors in fetchApi()
            retry: false
        }
    }
});

function App({ghostVersion, officialThemes, zapierTemplates, externalNavigate, darkMode = false, unsplashConfig, fetchKoenigLexical, sentryDSN, onUpdate, onInvalidate, onDelete}: AppProps) {
    const appClassName = clsx(
        'admin-x-settings admin-x-base h-[100vh] w-full overflow-y-auto overflow-x-hidden',
        darkMode && 'dark'
    );

    return (
        <SentryErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ServicesProvider fetchKoenigLexical={fetchKoenigLexical} ghostVersion={ghostVersion} officialThemes={officialThemes} sentryDSN={sentryDSN} unsplashConfig={unsplashConfig} zapierTemplates={zapierTemplates} onDelete={onDelete} onInvalidate={onInvalidate} onUpdate={onUpdate}>
                    <GlobalDataProvider>
                        <RoutingProvider externalNavigate={externalNavigate}>
                            <GlobalDirtyStateProvider>
                                <DesignSystemProvider>
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
                                </DesignSystemProvider>
                            </GlobalDirtyStateProvider>
                        </RoutingProvider>
                    </GlobalDataProvider>
                </ServicesProvider>
            </QueryClientProvider>
        </SentryErrorBoundary>
    );
}

export default App;
