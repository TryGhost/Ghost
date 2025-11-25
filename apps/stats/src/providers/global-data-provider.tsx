import {Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {ReactNode, createContext, useContext, useState} from 'react';
import {STATS_DEFAULT_RANGE_KEY, STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {Setting, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {StatsConfig, useTinybirdToken} from '@tryghost/admin-x-framework';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

interface GlobalData {
    data: Config | undefined;
    site: {
        url?: string;
        icon?: string;
        title?: string;
    };
    statsConfig: StatsConfig | undefined;
    tinybirdToken: string | undefined;
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
    const config = useBrowseConfig();
    // config.data is ConfigResponseType which has shape { config: Config }
    const configData = config.data?.config;
    const hasStatsConfig = Boolean(configData?.stats);
    const tinybirdTokenQuery = useTinybirdToken({enabled: hasStatsConfig});
    const [range, setRange] = useState(STATS_RANGE_OPTIONS[STATS_DEFAULT_RANGE_KEY].value);
    // Initialize with all audiences selected (binary 111 = 7)
    const [audience, setAudience] = useState(7);
    const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);

    // Check for errors in the main requests
    const ghostRequests = [config, settings, site];
    const ghostError = ghostRequests.map(request => request.error).find(Boolean);
    const tinybirdError = hasStatsConfig ? tinybirdTokenQuery.error : null;
    const error = ghostError || tinybirdError;
    
    // Check loading states
    const isGhostLoading = ghostRequests.some(request => request.isLoading);
    const isTinybirdLoading = hasStatsConfig ? tinybirdTokenQuery.isLoading : false;
    const isLoading = isGhostLoading || isTinybirdLoading;

    if (error) {
        throw error;
    }

    // Extract site data
    const siteData = {
        url: site.data?.site.url,
        icon: site.data?.site.icon,
        title: site.data?.site.title
    };

    return <GlobalDataContext.Provider value={{
        data: configData,
        site: siteData,
        statsConfig: configData?.stats,
        tinybirdToken: tinybirdTokenQuery.token,
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
