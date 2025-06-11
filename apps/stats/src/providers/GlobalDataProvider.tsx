import {Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {ReactNode, createContext, useContext, useState} from 'react';
import {STATS_DEFAULT_RANGE_KEY, STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {Setting, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {StatsConfig} from '@tryghost/admin-x-framework';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

interface GlobalData {
    data: Config | undefined;
    statsConfig: StatsConfig | undefined;
    isLoading: boolean;
    range: number;
    audience: number;
    setAudience: (value: number) => void;
    setRange: (value: number) => void;
    settings: Setting[];
    selectedNewsletterId: string | null;
    setSelectedNewsletterId: (id: string | null) => void;
}

const GlobalDataContext = createContext<GlobalData | undefined>(undefined);

export const useGlobalData = () => {
    const context = useContext(GlobalDataContext);
    if (context === undefined) {
        throw new Error('useGlobalData must be used within a GlobalDataProvider');
    }
    return context;
};

const GlobalDataProvider = ({children}: { children: ReactNode }) => {
    const settings = useBrowseSettings();
    const site = useBrowseSite();
    const config = useBrowseConfig() as unknown as { data: Config & { config: { stats?: StatsConfig } } | null, isLoading: boolean, error: Error | null };
    const [range, setRange] = useState(STATS_RANGE_OPTIONS[STATS_DEFAULT_RANGE_KEY].value);
    // Initialize with all audiences selected (binary 111 = 7)
    const [audience, setAudience] = useState(7);
    const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);

    const requests = [config, settings, site];
    const error = requests.map(request => request.error).find(Boolean);
    const isLoading = requests.some(request => request.isLoading);

    if (error) {
        throw error;
    }

    // Add url and icon from site data to config data
    const dataWithUrl = config.data ? {
        ...config.data,
        url: site.data?.site.url,
        icon: site.data?.site.icon
    } : undefined;

    return <GlobalDataContext.Provider value={{
        data: dataWithUrl as Config | undefined,
        statsConfig: config.data?.config?.stats,
        isLoading,
        range,
        setRange,
        audience,
        setAudience,
        settings: settings.data?.settings || [],
        selectedNewsletterId,
        setSelectedNewsletterId
    }}>
        {children}
    </GlobalDataContext.Provider>;
};

export default GlobalDataProvider;
