import React, {createContext, useContext, useMemo} from 'react';
import setupGhostApi from '../../utils/api';
import {OfficialTheme} from '../../models/themes';

export interface FileService {
    uploadImage: (file: File) => Promise<string>;
}
interface ServicesContextProps {
    api: ReturnType<typeof setupGhostApi>;
    fileService: FileService|null;
    officialThemes: OfficialTheme[];
}

interface ServicesProviderProps {
    children: React.ReactNode;
    ghostVersion: string;
    officialThemes: OfficialTheme[];
}

const ServicesContext = createContext<ServicesContextProps>({
    api: setupGhostApi({ghostVersion: ''}),
    fileService: null,
    officialThemes: []
});

const ServicesProvider: React.FC<ServicesProviderProps> = ({children, ghostVersion, officialThemes}) => {
    const apiService = useMemo(() => setupGhostApi({ghostVersion}), [ghostVersion]);
    const fileService = useMemo(() => ({
        uploadImage: async (file: File): Promise<string> => {
            const response = await apiService.images.upload({file});
            return response.images[0].url;
        }
    }), [apiService]);

    return (
        <ServicesContext.Provider value={{
            api: apiService,
            fileService,
            officialThemes
        }}>
            {children}
        </ServicesContext.Provider>
    );
};

export {ServicesContext, ServicesProvider};

export const useServices = () => useContext(ServicesContext);

export const useApi = () => useServices().api;

export const useOfficialThemes = () => useServices().officialThemes;
