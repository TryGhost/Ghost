import GlobalDataProvider from './GlobalDataProvider';
import useSearchService, {SearchService} from '../../utils/search';
import {ReactNode, createContext, useContext} from 'react';
import {ScrollSectionProvider} from '../../hooks/useScrollSection';
import {ZapierTemplate} from '../settings/advanced/integrations/ZapierModal';

export type ThemeVariant = {
    category: string;
    previewUrl: string;
    image: string;
};

export type OfficialTheme = {
    name: string;
    category: string;
    previewUrl: string;
    ref: string;
    image: string;
    url?: string;
    variants?: ThemeVariant[]
};

export interface UpgradeStatusType {
    isRequired: boolean;
    message: string;
}

interface SettingsAppContextType {
    officialThemes: OfficialTheme[];
    zapierTemplates: ZapierTemplate[];
    search: SearchService;
    upgradeStatus?: UpgradeStatusType;
}

const SettingsAppContext = createContext<SettingsAppContextType>({
    officialThemes: [],
    zapierTemplates: [],
    search: {filter: '', setFilter: () => {}, checkVisible: () => true, highlightKeywords: () => ''}
});

type SettingsAppProviderProps = Omit<SettingsAppContextType, 'search'> & {children: ReactNode};

const SettingsAppProvider: React.FC<SettingsAppProviderProps> = ({children, ...props}) => {
    const search = useSearchService();

    return (
        <SettingsAppContext.Provider value={{
            ...props,
            search
        }}>
            <GlobalDataProvider>
                <ScrollSectionProvider>
                    {children}
                </ScrollSectionProvider>
            </GlobalDataProvider>
        </SettingsAppContext.Provider>
    );
};

export default SettingsAppProvider;

export const useSettingsApp = () => useContext(SettingsAppContext);

export const useOfficialThemes = () => useSettingsApp().officialThemes;

export const useSearch = () => useSettingsApp().search;

export const useUpgradeStatus = () => useSettingsApp().upgradeStatus;
