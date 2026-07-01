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
// query may error. In any of those cases `usage` is `undefined`, which the
// caller distinguishes from a resolved zero ({visits: 0}). `loading` and
// `error` are surfaced too so the caller can hide the count while loading or on
// error rather than rendering a misleading "0". Gating on the web-analytics
// setting here means every consumer (the share modal, opened from several
// places, and the analytics card) behaves consistently when analytics is off.
export const useGiftLinkUsage = ({postUuid, token, enabled = true}: {
    postUuid?: string;
    token?: string;
    enabled?: boolean;
}) => {
    const {data: configData} = useBrowseConfig();
    const statsConfig = configData?.config?.stats as StatsConfig | undefined;

    const {data: settingsData} = useBrowseSettings();
    const webAnalyticsEnabled = getSettingValue<boolean>(settingsData?.settings ?? null, 'web_analytics_enabled') ?? false;

    // Filter to the current token server-side (api_gift_link_visits takes an
    // exact-match gift_link param), so we fetch only this link's row instead of
    // every link on the post.
    const params = useMemo(() => ({
        site_uuid: statsConfig?.id || '',
        post_uuid: postUuid || '',
        gift_link: token || ''
    }), [statsConfig?.id, postUuid, token]);

    const {data, loading, error} = useTinybirdQuery({
        endpoint: 'api_gift_link_visits',
        statsConfig: statsConfig || {id: ''},
        params,
        enabled: enabled && webAnalyticsEnabled && Boolean(statsConfig?.id) && Boolean(postUuid) && Boolean(token)
    });

    const usage = useMemo<GiftLinkUsage | undefined>(() => {
        // Web analytics off, no token yet, the query is disabled/loading, or it
        // errored → no data to show. Distinct from "ran and found zero", which
        // yields {visits: 0}.
        if (!webAnalyticsEnabled || !token || error || !Array.isArray(data)) {
            return undefined;
        }
        // The query is scoped to this token, so there is at most one row.
        const row = (data as unknown as GiftLinkVisitsRow[])[0];
        return {
            visits: Number(row?.visits) || 0,
            views: Number(row?.views) || 0
        };
    }, [data, token, error, webAnalyticsEnabled]);

    return {usage, loading, error};
};
