import React, {createContext, useContext} from 'react';
import useSearchService, {SearchService} from '../../utils/search';
import {ZapierTemplate} from '../settings/advanced/integrations/ZapierModal';

export type OfficialTheme = {
    name: string;
    category: string;
    previewUrl: string;
    ref: string;
    image: string;
    url?: string;
};

interface ServicesContextProps {
    ghostVersion: string
    officialThemes: OfficialTheme[];
    zapierTemplates: ZapierTemplate[];
    search: SearchService;
    toggleFeatureFlag: (flag: string, enabled: boolean) => void;
}

interface ServicesProviderProps {
    children: React.ReactNode;
    ghostVersion: string;
    zapierTemplates: ZapierTemplate[];
    officialThemes: OfficialTheme[];
    toggleFeatureFlag: (flag: string, enabled: boolean) => void;
}

const ServicesContext = createContext<ServicesContextProps>({
    ghostVersion: '',
    officialThemes: [],
    zapierTemplates: [],
    search: {filter: '', setFilter: () => {}, checkVisible: () => true},
    toggleFeatureFlag: () => {}
});

const ServicesProvider: React.FC<ServicesProviderProps> = ({children, ghostVersion, zapierTemplates, officialThemes, toggleFeatureFlag}) => {
    const search = useSearchService();

    return (
        <ServicesContext.Provider value={{
            ghostVersion,
            officialThemes,
            zapierTemplates,
            search,
            toggleFeatureFlag
        }}>
            {children}
        </ServicesContext.Provider>
    );
};

export {ServicesContext, ServicesProvider};

export const useServices = () => useContext(ServicesContext);

export const useOfficialThemes = () => useServices().officialThemes;

export const useSearch = () => useServices().search;
