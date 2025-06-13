import {Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {ReactNode, createContext, useContext, useState} from 'react';
import {STATS_RANGES} from '@src/utils/constants';
import {Setting, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {StatsConfig} from '@tryghost/admin-x-framework';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

type PostAnalyticsContextType = {
    data: Config | undefined;
    statsConfig: StatsConfig | undefined;
    isLoading: boolean;
    range: number;
    audience: number;
    setAudience: (value: number) => void;
    setRange: (value: number) => void;
    settings: Setting[];
}

const PostAnalyticsContext = createContext<PostAnalyticsContextType | undefined>(undefined);

export const useGlobalData = () => {
    const context = useContext(PostAnalyticsContext);
    if (!context) {
        throw new Error('useGlobalData must be used within a PostAnalyticsProvider');
    }
    return context;
};

const PostAnalyticsProvider = ({children}: { children: ReactNode }) => {
    const config = useBrowseConfig();
    const site = useBrowseSite();
    const [range, setRange] = useState(STATS_RANGES.LAST_30_DAYS.value);
    const settings = useBrowseSettings();

    // Initialize with all audiences selected (binary 111 = 7)
    const [audience, setAudience] = useState(7);

    const requests = [config, site, settings];
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

    return <PostAnalyticsContext.Provider value={{
        data: dataWithUrl as Config | undefined,
        statsConfig: config.data?.config?.stats as StatsConfig | undefined,
        isLoading,
        range,
        setRange,
        audience,
        setAudience,
        settings: settings.data?.settings || []
    }}>
        {children}
    </PostAnalyticsContext.Provider>;
};

export default PostAnalyticsProvider;
