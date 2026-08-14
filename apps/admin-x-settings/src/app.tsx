import MainContent from './main-content';
import NiceModal from '@ebay/nice-modal-react';
import SettingsAppProvider, {type UpgradeStatusType} from './components/providers/settings-app-provider';
import SettingsRouter, {loadModals, modalPaths} from './components/providers/settings-router';
import {RoutingProvider} from '@tryghost/admin-x-framework/routing';

interface AppProps {
    upgradeStatus?: UpgradeStatusType;
}

export function App({upgradeStatus}: AppProps) {
    return (
        <SettingsAppProvider upgradeStatus={upgradeStatus}>
            <NiceModal.Provider>
                <RoutingProvider basePath='settings' modals={{paths: modalPaths, load: loadModals}}>
                    <div className='admin-x-base admin-x-settings [--color-focus-ring:var(--color-green-500)] [--focus-ring:var(--color-green-500)]'>
                        <NiceModal.Provider>
                            <SettingsRouter />
                            <MainContent />
                        </NiceModal.Provider>
                    </div>
                </RoutingProvider>
            </NiceModal.Provider>
        </SettingsAppProvider>
    );
}
