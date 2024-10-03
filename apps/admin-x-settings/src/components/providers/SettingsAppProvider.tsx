import GlobalDataProvider from './GlobalDataProvider';
import useSearchService, {SearchService} from '../../utils/search';
import {ReactNode, createContext, useContext, useState} from 'react';
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

export type Sorting = {
    type: string;
    option?: string;
    direction?: string;
}

export interface UpgradeStatusType {
    isRequired: boolean;
    message: string;
}

interface SettingsAppContextType {
    officialThemes: OfficialTheme[];
    zapierTemplates: ZapierTemplate[];
    search: SearchService;
    upgradeStatus?: UpgradeStatusType;
    sortingState?: Sorting[];
    setSortingState?: (sortingState: Sorting[]) => void;
}

const SettingsAppContext = createContext<SettingsAppContextType>({
    officialThemes: [],
    zapierTemplates: [],
    search: {
        filter: '',
        setFilter: () => {},
        checkVisible: () => true,
        highlightKeywords: () => '',
        noResult: false,
        setNoResult: () => {}
    },
    sortingState: []
});

type SettingsAppProviderProps = Omit<SettingsAppContextType, 'search'> & {children: ReactNode};

const SettingsAppProvider: React.FC<SettingsAppProviderProps> = ({children, ...props}) => {
    const search = useSearchService();

    // a few sane defaults for keeping a sorting state
    const [sortingState, setSortingState] = useState<Sorting[]>([{
        type: 'offers',
        option: 'date-added',
        direction: 'desc'
    }]);

    return (
        <SettingsAppContext.Provider value={{
            ...props,
            search,
            sortingState,
            setSortingState
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

export const useSortingState = () => {
    const {sortingState, setSortingState} = useSettingsApp();
    return {sortingState, setSortingState};
};
