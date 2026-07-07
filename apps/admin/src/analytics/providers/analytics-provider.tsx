import {type ReactNode, useState} from 'react';
import {AnalyticsContext} from '@/analytics/providers/analytics-context';
import {STATS_DEFAULT_RANGE_KEY, STATS_RANGE_OPTIONS} from '@/analytics/utils/constants';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useTinybirdToken} from '@tryghost/admin-x-framework';

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
        throw error instanceof Error ? error : new Error('Failed to load analytics framework data');
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
