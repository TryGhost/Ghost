import {type Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {type Setting, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {type StatsConfig, useTinybirdToken} from '@tryghost/admin-x-framework';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';

export interface AnalyticsFrameworkData {
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

/**
 * Reads the framework-owned data the analytics views need (config/site/settings
 * and the Tinybird token) straight from the shell's FrameworkProvider. These are
 * react-query hooks, so calls across views share one cache entry — nothing is
 * re-fetched per consumer, and the data no longer lives in AnalyticsProvider.
 *
 * Throws on request error so the surrounding route error boundary can render a
 * failure state (matching the previous GlobalDataProvider behaviour).
 */
export const useAnalyticsData = (): AnalyticsFrameworkData => {
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

    return {
        data: configData,
        site: {
            url: site.data?.site.url,
            icon: site.data?.site.icon,
            title: site.data?.site.title
        },
        statsConfig: configData?.stats,
        tinybirdToken: tinybirdTokenQuery.token,
        isLoading,
        settings: settings.data?.settings || []
    };
};
