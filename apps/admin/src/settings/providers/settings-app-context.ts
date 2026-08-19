import {type ComponentId, type SearchService} from '@/settings/utils/search';
import {type ZapierTemplate} from '@/settings/advanced/integrations/zapier-modal';
import {createContext, useContext} from 'react';
import {officialThemes} from '@/settings/data/official-themes';
import {zapierTemplates} from '@/settings/data/zapier-templates';

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

export interface SettingsAppContextType {
    officialThemes: OfficialTheme[];
    zapierTemplates: ZapierTemplate[];
    search: SearchService;
    upgradeStatus?: UpgradeStatusType;
    sortingState?: Sorting[];
    setSortingState?: (sortingState: Sorting[]) => void;
    offersShowArchived: boolean;
    setOffersShowArchived: (show: boolean) => void;
}

export const SettingsAppContext = createContext<SettingsAppContextType>({
    officialThemes,
    zapierTemplates,
    search: {
        filter: '',
        setFilter: () => {},
        checkVisible: () => true,
        highlightKeywords: () => '',
        noResult: false,
        setNoResult: () => {},
        registerComponent: () => {},
        unregisterComponent: () => {},
        getVisibleComponents: () => new Set<ComponentId>(),
        isOnlyVisibleComponent: () => false
    },
    sortingState: [],
    offersShowArchived: false,
    setOffersShowArchived: () => {}
});

export const useSettingsApp = () => useContext(SettingsAppContext);

export const useOfficialThemes = () => useSettingsApp().officialThemes;

export const useSearch = () => useSettingsApp().search;

export const useUpgradeStatus = () => useSettingsApp().upgradeStatus;

export const useSortingState = () => {
    const {sortingState, setSortingState} = useSettingsApp();
    return {sortingState, setSortingState};
};

export const useOffersShowArchived = () => {
    const {offersShowArchived, setOffersShowArchived} = useSettingsApp();
    return {offersShowArchived, setOffersShowArchived};
};
