import {type Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {type ReactNode, createContext, useContext, useState} from 'react';
import {STATS_DEFAULT_RANGE_KEY, STATS_RANGE_OPTIONS} from '@/analytics/utils/constants';
import {type Setting, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {type StatsConfig, useTinybirdToken} from '@tryghost/admin-x-framework';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

interface AnalyticsData {
    // --- View-state: owned by this provider (the slim end-state) ---
    range: number;
    setRange: (value: number) => void;
    selectedNewsletterId: string | null;
    setSelectedNewsletterId: (id: string | null) => void;

    // --- TODO(PLA-192): framework-data below is a temporary passthrough. ---
    // config/site/settings/tinybirdToken all duplicate data the shell already
    // exposes via admin-x-framework hooks (FrameworkProvider + AppProvider wrap
    // the whole admin tree). Hoisting these out of the analytics context lets
    // this provider shrink to just the view-state above. Deferred to avoid
    // churning the ~18 consumer call sites in this spike.
    data: Config | undefined;
    site: {
        url?: string;
        icon?: string;
        title?: string;
    };
    statsConfig: StatsConfig | undefined;
    tinybirdToken: string | undefined;
    isLoading: boolean;
    settings: Setting[];
}

const AnalyticsContext = createContext<AnalyticsData | undefined>(undefined);

export const useAnalytics = () => {
    const context = useContext(AnalyticsContext);
    if (context === undefined) {
        throw new Error('useAnalytics must be used within an AnalyticsProvider');
    }
    return context;
};

// TODO(PLA-124): Back-compat alias. Migrate the ~18 `useGlobalData` call sites in
// src/analytics to `useAnalytics`, then remove this export.
export const useGlobalData = useAnalytics;

const AnalyticsProvider = ({children}: { children: ReactNode }) => {
    // --- View-state (this provider's real responsibility) ---
    const [range, setRange] = useState(STATS_RANGE_OPTIONS[STATS_DEFAULT_RANGE_KEY].value);
    const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);

    // --- TODO(PLA-192): framework-data half — hoist to shell FrameworkProvider ---
    const settings = useBrowseSettings();
    const site = useBrowseSite();
    const config = useBrowseConfig();
    // config.data is ConfigResponseType which has shape { config: Config }
    const configData = config.data?.config;
    // Load the token only when Tinybird is provisioned; the web analytics
    // kill-switch is applied inside useTinybirdToken.
    const hasStatsConfig = Boolean(configData?.stats);
    const tinybirdTokenQuery = useTinybirdToken({enabled: hasStatsConfig});

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

    return <AnalyticsContext.Provider value={{
        range,
        setRange,
        selectedNewsletterId,
        setSelectedNewsletterId,
        // TODO(PLA-192): framework-data passthrough
        data: configData,
        site: siteData,
        statsConfig: configData?.stats,
        tinybirdToken: tinybirdTokenQuery.token,
        isLoading,
        settings: settings.data?.settings || []
    }}>
        {children}
    </AnalyticsContext.Provider>;
};

export default AnalyticsProvider;
