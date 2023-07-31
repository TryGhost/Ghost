import React, {createContext, useContext, useMemo} from 'react';
import setupGhostApi from '../../utils/api';
import useDataService, {DataService, bulkEdit, placeholderDataService} from '../../utils/dataService';
import useSearchService, {SearchService} from '../../utils/search';
import {OfficialTheme} from '../../models/themes';
import {Tier} from '../../types/api';

export interface FileService {
    uploadImage: (file: File) => Promise<string>;
}
interface ServicesContextProps {
    api: ReturnType<typeof setupGhostApi>;
    fileService: FileService|null;
    officialThemes: OfficialTheme[];
    search: SearchService
    tiers: DataService<Tier>
}

interface ServicesProviderProps {
    children: React.ReactNode;
    ghostVersion: string;
    officialThemes: OfficialTheme[];
}

const ServicesContext = createContext<ServicesContextProps>({
    api: setupGhostApi({ghostVersion: ''}),
    fileService: null,
    officialThemes: [],
    search: {filter: '', setFilter: () => {}, checkVisible: () => true},
    tiers: placeholderDataService
});

const ServicesProvider: React.FC<ServicesProviderProps> = ({children, ghostVersion, officialThemes}) => {
    const apiService = useMemo(() => setupGhostApi({ghostVersion}), [ghostVersion]);
    const fileService = useMemo(() => ({
        uploadImage: async (file: File): Promise<string> => {
            const response = await apiService.images.upload({file});
            return response.images[0].url;
        }
    }), [apiService]);
    const search = useSearchService();
    const tiers = useDataService({
        key: 'tiers',
        browse: apiService.tiers.browse,
        edit: bulkEdit('tiers', apiService.tiers.edit),
        add: apiService.tiers.add
    });

    return (
        <ServicesContext.Provider value={{
            api: apiService,
            fileService,
            officialThemes,
            search,
            tiers
        }}>
            {children}
        </ServicesContext.Provider>
    );
};

export {ServicesContext, ServicesProvider};

export const useServices = () => useContext(ServicesContext);

export const useApi = () => useServices().api;

export const useOfficialThemes = () => useServices().officialThemes;

export const useSearch = () => useServices().search;

export const useTiers = () => useServices().tiers;
