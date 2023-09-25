import GlobalDataProvider from './components/providers/GlobalDataProvider';
import MainContent from './MainContent';
import NiceModal from '@ebay/nice-modal-react';
import RoutingProvider, {ExternalLink} from './components/providers/RoutingProvider';
import clsx from 'clsx';
import {DefaultHeaderTypes} from './utils/unsplash/UnsplashTypes';
import {ErrorBoundary} from '@sentry/react';
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
    toggleFeatureFlag: (flag: string, enabled: boolean) => void;
    darkMode?: boolean;
    unsplashConfig: DefaultHeaderTypes
    sentryDSN: string | null;
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

function SentryErrorBoundary({children}: {children: React.ReactNode}) {
    return (
        <ErrorBoundary>
            {children}
        </ErrorBoundary>
    );
}

function App({ghostVersion, officialThemes, zapierTemplates, externalNavigate, toggleFeatureFlag, darkMode = false, unsplashConfig, sentryDSN}: AppProps) {
    const appClassName = clsx(
        'admin-x-settings h-[100vh] w-full overflow-y-auto overflow-x-hidden',
        darkMode && 'dark'
    );

    return (
        <SentryErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ServicesProvider ghostVersion={ghostVersion} officialThemes={officialThemes} sentryDSN={sentryDSN} toggleFeatureFlag={toggleFeatureFlag} unsplashConfig={unsplashConfig} zapierTemplates={zapierTemplates}>
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
        </SentryErrorBoundary>
    );
}

export default App;
