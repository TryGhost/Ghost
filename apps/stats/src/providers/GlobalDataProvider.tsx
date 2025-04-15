import {Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {ReactNode, createContext, useContext, useState} from 'react';
import {STATS_DEFAULT_RANGE_KEY, STATS_RANGE_OPTIONS} from '@src/utils/constants';

type GlobalData = Config & {
    config: {
        stats?: {
            endpoint: string;
            id: string;
            token: string;
        };
    };
}

type GlobalDataContextType = {
    data: GlobalData | undefined;
    isLoading: boolean;
    range: number;
    audience: number;
    setAudience: (value: number) => void;
    setRange: (value: number) => void;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export const useGlobalData = () => {
    const context = useContext(GlobalDataContext);
    if (!context) {
        throw new Error('useGlobalData must be used within a GlobalDataProvider');
    }
    return context;
};

const GlobalDataProvider = ({children}: { children: ReactNode }) => {
    const config = useBrowseConfig() as unknown as { data: GlobalData | null, isLoading: boolean, error: Error | null };
    const [range, setRange] = useState(STATS_RANGE_OPTIONS[STATS_DEFAULT_RANGE_KEY].value);
    // Initialize with all audiences selected (binary 111 = 7)
    const [audience, setAudience] = useState(7);

    const requests = [config];
    const error = requests.map(request => request.error).find(Boolean);
    const isLoading = requests.some(request => request.isLoading);

    if (error) {
        throw error;
    }

    return <GlobalDataContext.Provider value={{
        data: config.data ?? undefined,
        isLoading,
        range,
        setRange,
        audience,
        setAudience
    }}>
        {children}
    </GlobalDataContext.Provider>;
};

export default GlobalDataProvider;
