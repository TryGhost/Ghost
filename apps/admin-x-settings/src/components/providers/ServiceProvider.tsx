import React, {createContext, useContext} from 'react';
import useSearchService, {SearchService} from '../../utils/search';
import {OfficialTheme} from '../../models/themes';

interface ServicesContextProps {
    ghostVersion: string
    officialThemes: OfficialTheme[];
    search: SearchService
}

interface ServicesProviderProps {
    children: React.ReactNode;
    ghostVersion: string;
    officialThemes: OfficialTheme[];
}

const ServicesContext = createContext<ServicesContextProps>({
    ghostVersion: '',
    officialThemes: [],
    search: {filter: '', setFilter: () => {}, checkVisible: () => true}
});

const ServicesProvider: React.FC<ServicesProviderProps> = ({children, ghostVersion, officialThemes}) => {
    const search = useSearchService();

    return (
        <ServicesContext.Provider value={{
            ghostVersion,
            officialThemes,
            search
        }}>
            {children}
        </ServicesContext.Provider>
    );
};

export {ServicesContext, ServicesProvider};

export const useServices = () => useContext(ServicesContext);

export const useOfficialThemes = () => useServices().officialThemes;

export const useSearch = () => useServices().search;
