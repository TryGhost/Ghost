import {Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {ReactNode, createContext, useContext, useState} from 'react';
import {STATS_DEFAULT_RANGE_KEY, STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {Setting, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {StatsConfig} from '@tryghost/admin-x-framework';

type GlobalDataContextType = {
    data: Config | undefined;
    statsConfig: StatsConfig | undefined;
    isLoading: boolean;
    range: number;
    audience: number;
    setAudience: (value: number) => void;
    setRange: (value: number) => void;
    settings: Setting[]
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
    const settings = useBrowseSettings();
    const config = useBrowseConfig() as unknown as { data: Config & { config: { stats?: StatsConfig } } | null, isLoading: boolean, error: Error | null };
    const [range, setRange] = useState(STATS_RANGE_OPTIONS[STATS_DEFAULT_RANGE_KEY].value);
    // Initialize with all audiences selected (binary 111 = 7)
    const [audience, setAudience] = useState(7);

    const requests = [config, settings];
    const error = requests.map(request => request.error).find(Boolean);
    const isLoading = requests.some(request => request.isLoading);

    if (error) {
        throw error;
    }

    return <GlobalDataContext.Provider value={{
        data: config.data ?? undefined,
        statsConfig: config.data?.config?.stats,
        isLoading,
        range,
        setRange,
        audience,
        setAudience,
        settings: settings.data?.settings || []
    }}>
        {children}
    </GlobalDataContext.Provider>;
};

export default GlobalDataProvider;
