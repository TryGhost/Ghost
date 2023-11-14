import MainContent from './MainContent';
import SettingsAppProvider, {OfficialTheme, UpgradeStatusType} from './components/providers/SettingsAppProvider';
import SettingsRouter, {loadModals, modalPaths} from './components/providers/SettingsRouter';
import {DesignSystemApp, FetchKoenigLexical} from '@tryghost/admin-x-design-system';
import {FrameworkProvider, FrameworkProviderProps} from '@tryghost/admin-x-framework';
import {ZapierTemplate} from './components/settings/advanced/integrations/ZapierModal';

interface AppProps extends Omit<FrameworkProviderProps, 'basePath' | 'modals' | 'children'> {
    officialThemes: OfficialTheme[];
    zapierTemplates: ZapierTemplate[];
    darkMode: boolean;
    fetchKoenigLexical: FetchKoenigLexical;
    upgradeStatus?: UpgradeStatusType;
}

function App({officialThemes, zapierTemplates, upgradeStatus, darkMode, fetchKoenigLexical, ...props}: AppProps) {
    return (
        <FrameworkProvider basePath='settings' modals={{paths: modalPaths, load: loadModals}} {...props}>
            <SettingsAppProvider officialThemes={officialThemes} upgradeStatus={upgradeStatus} zapierTemplates={zapierTemplates}>
                <DesignSystemApp className='admin-x-settings' darkMode={darkMode} fetchKoenigLexical={fetchKoenigLexical} id='admin-x-settings'>
                    <SettingsRouter />
                    <MainContent />
                </DesignSystemApp>
            </SettingsAppProvider>
        </FrameworkProvider>
    );
}

export default App;
