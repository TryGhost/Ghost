import DesignSystemProvider from './admin-x-ds/providers/DesignSystemProvider';
import GlobalDataProvider from './components/providers/GlobalDataProvider';
import MainContent from './MainContent';
import NiceModal from '@ebay/nice-modal-react';
import RoutingProvider, {ExternalLink} from './components/providers/RoutingProvider';
import clsx from 'clsx';
import {DefaultHeaderTypes} from './unsplash/UnsplashTypes';
import {FetchKoenigLexical, OfficialTheme, ServicesProvider} from './components/providers/ServiceProvider';
import {GlobalDirtyStateProvider} from './hooks/useGlobalDirtyState';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ScrollSectionProvider} from './hooks/useScrollSection';
import {ErrorBoundary as SentryErrorBoundary} from '@sentry/react';
import {Toaster} from 'react-hot-toast';
import {UpgradeStatusType} from './utils/globalTypes';
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
    upgradeStatus?: UpgradeStatusType;
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

function App({ghostVersion, officialThemes, zapierTemplates, externalNavigate, darkMode = false, unsplashConfig, fetchKoenigLexical, sentryDSN, onUpdate, onInvalidate, onDelete, upgradeStatus}: AppProps) {
    const appClassName = clsx(
        'admin-x-settings admin-x-base',
        darkMode && 'dark'
        //'!h-[calc(100vh-55px)] w-full overflow-y-auto overflow-x-hidden tablet:!h-[100vh]'
    );

    return (
        <SentryErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ServicesProvider fetchKoenigLexical={fetchKoenigLexical} ghostVersion={ghostVersion} officialThemes={officialThemes} sentryDSN={sentryDSN} unsplashConfig={unsplashConfig} upgradeStatus={upgradeStatus} zapierTemplates={zapierTemplates} onDelete={onDelete} onInvalidate={onInvalidate} onUpdate={onUpdate}>
                    <GlobalDataProvider>
                        <ScrollSectionProvider>
                            <RoutingProvider externalNavigate={externalNavigate}>
                                <GlobalDirtyStateProvider>
                                    <DesignSystemProvider>
                                        <div className={appClassName} id="admin-x-root" style={{
                                            // height: '100vh',
                                            // width: '100%'
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
                        </ScrollSectionProvider>
                    </GlobalDataProvider>
                </ServicesProvider>
            </QueryClientProvider>
        </SentryErrorBoundary>
    );
}

export default App;
