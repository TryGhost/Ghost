import DesignSystemProvider from './admin-x-ds/providers/DesignSystemProvider';
import Modal from './admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import clsx from 'clsx';
import queryClient from './utils/api/queryClient';
import {DefaultHeaderTypes} from './utils/unsplash/UnsplashTypes';
import {ExternalLink} from './components/providers/RoutingProvider';
import {FetchKoenigLexical, ServicesProvider} from './components/providers/ServiceProvider';
import {GlobalDirtyStateProvider} from './hooks/useGlobalDirtyState';
import {QueryClientProvider} from '@tanstack/react-query';
import {ErrorBoundary as SentryErrorBoundary} from '@sentry/react';
import {Toaster} from 'react-hot-toast';
import {useBrowseTiers, useEditTier} from './api/tiers';

interface AppProps {
    ghostVersion: string;
    externalNavigate: (link: ExternalLink) => void;
    darkMode?: boolean;
    unsplashConfig: DefaultHeaderTypes
    sentryDSN: string | null;
    fetchKoenigLexical: FetchKoenigLexical;
    onUpdate: (dataType: string, response: unknown) => void;
    onInvalidate: (dataType: string) => void;
    onDelete: (dataType: string, id: string) => void;
}

const TestModal = () => {
    return <Modal title="Test modal">
        Hello from React!
    </Modal>;
};

const TM = NiceModal.create(TestModal);

const Offers = () => {
    const {data: {tiers} = {}} = useBrowseTiers();
    const {mutateAsync: editTier} = useEditTier();

    return <div>
        {tiers?.map(tier => <div key={tier.id}>{tier.name}</div>)}
        <button className="text-green" type="button" onClick={() => tiers?.[0] && editTier({...tiers[0], name: `Updated name ${Date.now()}`})}>
            Edit tier
        </button>
        <button className="text-green" type="button" onClick={() => NiceModal.show(TM)}>
            Show modal
        </button>
    </div>;
};

const PrototypeOffersApp: React.FC<AppProps> = ({ghostVersion, darkMode = false, unsplashConfig, fetchKoenigLexical, sentryDSN, onUpdate, onInvalidate, onDelete}) => {
    const appClassName = clsx(
        'admin-x-settings admin-x-base h-[100vh] w-full overflow-y-auto overflow-x-hidden',
        darkMode && 'dark'
    );

    return (
        <SentryErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ServicesProvider fetchKoenigLexical={fetchKoenigLexical} ghostVersion={ghostVersion} officialThemes={[]} sentryDSN={sentryDSN} unsplashConfig={unsplashConfig} zapierTemplates={[]} onDelete={onDelete} onInvalidate={onInvalidate} onUpdate={onUpdate}>
                    {/* <RoutingProvider externalNavigate={externalNavigate}> */}
                    <GlobalDirtyStateProvider>
                        <DesignSystemProvider>
                            <div className={appClassName} id="admin-x-root" style={{
                                height: '100vh',
                                width: '100%'
                            }}
                            >
                                <Toaster />
                                <NiceModal.Provider>
                                    <Offers />
                                </NiceModal.Provider>
                            </div>
                        </DesignSystemProvider>
                    </GlobalDirtyStateProvider>
                    {/* </RoutingProvider> */}
                </ServicesProvider>
            </QueryClientProvider>
        </SentryErrorBoundary>
    );
};

export default PrototypeOffersApp;
