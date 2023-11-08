import MainContent from './MainContent';
import SettingsAppProvider, {OfficialTheme, UpgradeStatusType} from './components/providers/SettingsAppProvider';
import SettingsRouter from './components/providers/SettingsRouter';
import {AdminXApp, FrameworkProviderProps} from '@tryghost/admin-x-framework';
import {FetchKoenigLexical} from '@tryghost/admin-x-design-system';
import {ZapierTemplate} from './components/settings/advanced/integrations/ZapierModal';

interface AppProps extends Omit<FrameworkProviderProps, 'basePath' | 'children'> {
    officialThemes: OfficialTheme[];
    zapierTemplates: ZapierTemplate[];
    darkMode: boolean;
    fetchKoenigLexical: FetchKoenigLexical;
    upgradeStatus?: UpgradeStatusType;
}

function App({officialThemes, zapierTemplates, upgradeStatus, ...props}: AppProps) {
    return (
        <AdminXApp basePath='settings' className='admin-x-settings' id='admin-x-settings' {...props}>
            <SettingsAppProvider officialThemes={officialThemes} upgradeStatus={upgradeStatus} zapierTemplates={zapierTemplates}>
                <SettingsRouter />
                <MainContent />
            </SettingsAppProvider>
        </AdminXApp>
    );
}

export default App;
