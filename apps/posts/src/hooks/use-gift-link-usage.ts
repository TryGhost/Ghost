import {StatsConfig, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useMemo} from 'react';

export interface GiftLinkUsage {
    visits: number;
    views: number;
}

interface GiftLinkVisitsRow {
    gift_link: string;
    visits: number | string;
    views: number | string;
}

// Reads gift-link usage from the web-analytics pipeline (the same Tinybird
// mechanism every other analytics surface uses), keyed on the link token.
//
// Usage tracking is best-effort and entirely optional: it requires web
// analytics to be enabled, and analytics may be off (no statsConfig) or the
// query may error. In any of those cases `usage` is `undefined` and the caller
// simply omits the visitor count — the rest of the gift-link UI keeps working.
// Gating on the web-analytics setting here means every consumer (the share
// modal, opened from several places, and the analytics card) hides the count
// consistently when traffic analytics is turned off.
export const useGiftLinkUsage = ({postUuid, token, enabled = true}: {
    postUuid?: string;
    token?: string;
    enabled?: boolean;
}) => {
    const {data: configData} = useBrowseConfig();
    const statsConfig = configData?.config?.stats as StatsConfig | undefined;

    const {data: settingsData} = useBrowseSettings();
    const webAnalyticsEnabled = getSettingValue<boolean>(settingsData?.settings ?? null, 'web_analytics_enabled') ?? false;

    const params = useMemo(() => ({
        site_uuid: statsConfig?.id || '',
        post_uuid: postUuid || ''
    }), [statsConfig?.id, postUuid]);

    const {data, loading, error} = useTinybirdQuery({
        endpoint: 'api_gift_link_visits',
        statsConfig: statsConfig || {id: ''},
        params,
        enabled: enabled && webAnalyticsEnabled && Boolean(statsConfig?.id) && Boolean(postUuid)
    });

    const usage = useMemo<GiftLinkUsage | undefined>(() => {
        // Web analytics off, no token yet, the query is disabled/loading, or it
        // errored → no data to show. Distinct from "ran and found zero", which
        // yields {visits: 0}.
        if (!webAnalyticsEnabled || !token || error || !Array.isArray(data)) {
            return undefined;
        }
        const row = (data as unknown as GiftLinkVisitsRow[]).find(r => r.gift_link === token);
        return {
            visits: Number(row?.visits) || 0,
            views: Number(row?.views) || 0
        };
    }, [data, token, error, webAnalyticsEnabled]);

    return {usage, loading};
};
