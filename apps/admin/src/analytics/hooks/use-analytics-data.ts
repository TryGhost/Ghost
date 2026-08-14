import {type Config, useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {type Setting, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {type StatsConfig, useTinybirdToken} from '@tryghost/admin-x-framework';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useMemo} from 'react';

export interface AnalyticsSite {
    url?: string;
    icon?: string;
    title?: string;
}

export interface AnalyticsFrameworkData {
    config: Config | undefined;
    site: AnalyticsSite;
    statsConfig: StatsConfig | undefined;
    isLoading: boolean;
    settings: Setting[];
}

/**
 * Reads the framework-owned data the analytics views need (config/site/settings)
 * straight from the shell's FrameworkProvider. These are react-query hooks, so
 * calls across views share one cache entry — nothing is re-fetched per consumer,
 * and the data no longer lives in AnalyticsProvider.
 *
 * The Tinybird token is deliberately not returned — `useTinybirdQuery` resolves
 * its own. It is still requested here so its loading and error states gate the
 * views the way GlobalDataProvider used to.
 *
 * Throws on request error. `apps/admin` mounts no `errorElement`, so this
 * surfaces through React Router's default error boundary; the standalone
 * StatsErrorBoundary that used to catch it is gone along with the standalone app.
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

    // Stable identity: there are ~10 independent call sites, so a fresh object
    // literal per render would be a footgun for anything using it as a dep.
    const siteData = site.data?.site;
    const analyticsSite = useMemo(() => ({
        url: siteData?.url,
        icon: siteData?.icon,
        title: siteData?.title
    }), [siteData]);

    if (error) {
        throw error instanceof Error ? error : new Error('Failed to load analytics framework data');
    }

    return {
        config: configData,
        site: analyticsSite,
        statsConfig: configData?.stats,
        isLoading,
        settings: settings.data?.settings || []
    };
};
