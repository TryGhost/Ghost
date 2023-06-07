import React, {createContext, useMemo} from 'react';
import setupGhostApi from '../../utils/api';

export interface FileService {
    uploadImage: (file: File) => Promise<string>;
}
interface ServicesContextProps {
    api: ReturnType<typeof setupGhostApi>;
    fileService: FileService|null
}

interface ServicesProviderProps {
    children: React.ReactNode;
    ghostVersion: string;
}

const ServicesContext = createContext<ServicesContextProps>({
    api: setupGhostApi({ghostVersion: ''}),
    fileService: null
});

const ServicesProvider: React.FC<ServicesProviderProps> = ({children, ghostVersion}) => {
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
            fileService
        }}>
            {children}
        </ServicesContext.Provider>
    );
};

export {ServicesContext, ServicesProvider};
