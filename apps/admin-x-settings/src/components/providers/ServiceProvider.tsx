import React, {createContext, useContext} from 'react';
import useSearchService, {SearchService} from '../../utils/search';
import {DefaultHeaderTypes} from '../../unsplash/UnsplashTypes';
import {UpgradeStatusType} from '../../utils/globalTypes';
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

export type FetchKoenigLexical = () => Promise<any>

interface ServicesContextProps {
    ghostVersion: string
    officialThemes: OfficialTheme[];
    zapierTemplates: ZapierTemplate[];
    search: SearchService;
    unsplashConfig: DefaultHeaderTypes;
    sentryDSN: string | null;
    onUpdate: (dataType: string, response: unknown) => void;
    onInvalidate: (dataType: string) => void;
    onDelete: (dataType: string, id: string) => void;
    fetchKoenigLexical: FetchKoenigLexical;
    upgradeStatus?: UpgradeStatusType;
}

interface ServicesProviderProps {
    children: React.ReactNode;
    ghostVersion: string;
    zapierTemplates: ZapierTemplate[];
    officialThemes: OfficialTheme[];
    unsplashConfig: DefaultHeaderTypes;
    sentryDSN: string | null;
    onUpdate: (dataType: string, response: unknown) => void;
    onInvalidate: (dataType: string) => void;
    onDelete: (dataType: string, id: string) => void;
    fetchKoenigLexical: FetchKoenigLexical;
    upgradeStatus?: UpgradeStatusType;
}

const ServicesContext = createContext<ServicesContextProps>({
    ghostVersion: '',
    officialThemes: [],
    zapierTemplates: [],
    search: {filter: '', setFilter: () => {}, checkVisible: () => true, highlightKeywords: () => ''},
    unsplashConfig: {
        Authorization: '',
        'Accept-Version': '',
        'Content-Type': '',
        'App-Pragma': '',
        'X-Unsplash-Cache': true
    },
    sentryDSN: null,
    onUpdate: () => {},
    onInvalidate: () => {},
    onDelete: () => {},
    fetchKoenigLexical: async () => {},
    upgradeStatus: {
        isRequired: false,
        message: ''
    }
});

const ServicesProvider: React.FC<ServicesProviderProps> = ({children, ghostVersion, zapierTemplates, officialThemes, unsplashConfig, sentryDSN, onUpdate, onInvalidate, onDelete, fetchKoenigLexical, upgradeStatus}) => {
    const search = useSearchService();

    return (
        <ServicesContext.Provider value={{
            ghostVersion,
            officialThemes,
            zapierTemplates,
            search,
            unsplashConfig,
            sentryDSN,
            onUpdate,
            onInvalidate,
            onDelete,
            fetchKoenigLexical,
            upgradeStatus
        }}>
            {children}
        </ServicesContext.Provider>
    );
};

export {ServicesContext, ServicesProvider};

export const useServices = () => useContext(ServicesContext);

export const useOfficialThemes = () => useServices().officialThemes;

export const useSearch = () => useServices().search;

export const useSentryDSN = () => useServices().sentryDSN;

export const useUpgradeStatus = () => useServices().upgradeStatus;
