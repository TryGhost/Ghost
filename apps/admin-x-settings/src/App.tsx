import MainContent from './MainContent';
import NiceModal from '@ebay/nice-modal-react';
import SettingsAppProvider, {type OfficialTheme, type UpgradeStatusType} from './components/providers/SettingsAppProvider';
import SettingsRouter, {loadModals, modalPaths} from './components/providers/SettingsRouter';
import {DesignSystemApp, type DesignSystemAppProps} from '@tryghost/admin-x-design-system';
import {FrameworkProvider, type TopLevelFrameworkProps} from '@tryghost/admin-x-framework';
import {RoutingProvider} from '@tryghost/admin-x-framework/routing';
import {type ZapierTemplate} from './components/settings/advanced/integrations/ZapierModal';

interface AppProps {
    designSystem: DesignSystemAppProps;
    officialThemes: OfficialTheme[];
    zapierTemplates: ZapierTemplate[];
    upgradeStatus?: UpgradeStatusType;
}

export function App({designSystem, officialThemes, zapierTemplates, upgradeStatus}: AppProps) {
    return (
        <SettingsAppProvider officialThemes={officialThemes} upgradeStatus={upgradeStatus} zapierTemplates={zapierTemplates}>
            {/* NOTE: we need to have an extra NiceModal.Provider here because the one inside DesignSystemApp
                is loaded too late for possible modals in RoutingProvider, and it's quite hard to change it at
                this point */}
            <NiceModal.Provider>
                <RoutingProvider basePath='settings' modals={{paths: modalPaths, load: loadModals}}>
                    <DesignSystemApp className='admin-x-settings' {...designSystem}>
                        <SettingsRouter />
                        <MainContent />
                    </DesignSystemApp>
                </RoutingProvider>
            </NiceModal.Provider>
        </SettingsAppProvider>
    );
}

export function StandaloneApp({framework, designSystem, officialThemes, zapierTemplates, upgradeStatus}: AppProps & {framework: TopLevelFrameworkProps}) {
    return (
        <FrameworkProvider {...framework}>
            <App designSystem={designSystem} officialThemes={officialThemes} upgradeStatus={upgradeStatus} zapierTemplates={zapierTemplates} />
        </FrameworkProvider>
    );
}
