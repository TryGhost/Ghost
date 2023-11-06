import DesignSystemApp from '@tryghost/admin-x-design/global/DesignSystemApp';
import GlobalDataProvider from './components/providers/GlobalDataProvider';
import MainContent from './MainContent';
import RoutingProvider, {ExternalLink} from './components/providers/RoutingProvider';
import {DefaultHeaderTypes} from './unsplash/UnsplashTypes';
import {FetchKoenigLexical, OfficialTheme, ServicesProvider} from './components/providers/ServiceProvider';
import {GlobalDirtyStateProvider} from './hooks/useGlobalDirtyState';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ScrollSectionProvider} from './hooks/useScrollSection';
import {ErrorBoundary as SentryErrorBoundary} from '@sentry/react';
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
    return (
        <SentryErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ServicesProvider fetchKoenigLexical={fetchKoenigLexical} ghostVersion={ghostVersion} officialThemes={officialThemes} sentryDSN={sentryDSN} unsplashConfig={unsplashConfig} upgradeStatus={upgradeStatus} zapierTemplates={zapierTemplates} onDelete={onDelete} onInvalidate={onInvalidate} onUpdate={onUpdate}>
                    <GlobalDataProvider>
                        <ScrollSectionProvider>
                            <RoutingProvider externalNavigate={externalNavigate}>
                                <GlobalDirtyStateProvider>
                                    <DesignSystemApp className='admin-x-settings' darkMode={darkMode} id="admin-x-settings" style={{
                                        // height: '100vh',
                                        // width: '100%'
                                    }}>
                                        <MainContent />
                                    </DesignSystemApp>
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
