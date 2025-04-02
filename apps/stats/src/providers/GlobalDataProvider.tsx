import {Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {ReactNode, createContext, useContext} from 'react';

type GlobalData = Config & {
    config: {
        stats?: {
            id: string;
            token: string;
        };
    };
}

type GlobalDataContextType = {
    data: GlobalData | undefined;
    isLoading: boolean;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

const GlobalDataProvider = ({children}: { children: ReactNode }) => {
    const config = useBrowseConfig() as unknown as { data: GlobalData | null, isLoading: boolean, error: Error | null };

    const requests = [config];
    const error = requests.map(request => request.error).find(Boolean);
    const isLoading = requests.some(request => request.isLoading);

    if (error) {
        throw error;
    }

    return <GlobalDataContext.Provider value={{
        data: config.data ?? undefined,
        isLoading
    }}>
        {children}
    </GlobalDataContext.Provider>;
};

export const useGlobalData = () => {
    const context = useContext(GlobalDataContext);
    if (!context) {
        throw new Error('useGlobalData must be used within a GlobalDataProvider');
    }
    return context;
};

export default GlobalDataProvider;
