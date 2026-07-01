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
//
// The usage query is disabled until every prerequisite is in place (config,
// settings, and the token from the upstream active-link lookup). A disabled
// query reports `loading: false`, which would otherwise be indistinguishable
// from "ran and found zero". `tokenLoading` lets the caller pass in the
// active-link lookup's own loading state; combined with the config/settings
// reads here, `loading` stays true while any prerequisite is still resolving,
// so callers hide the count instead of flashing a transient "0".
export const useGiftLinkUsage = ({postUuid, token, tokenLoading = false, enabled = true}: {
    postUuid?: string;
    token?: string;
    tokenLoading?: boolean;
    enabled?: boolean;
}) => {
    const {data: configData, isLoading: configLoading} = useBrowseConfig();
    const statsConfig = configData?.config?.stats as StatsConfig | undefined;

    const {data: settingsData, isLoading: settingsLoading} = useBrowseSettings();
    const webAnalyticsEnabled = getSettingValue<boolean>(settingsData?.settings ?? null, 'web_analytics_enabled') ?? false;

    // Filter to the current token server-side (api_gift_link_visits takes an
    // exact-match gift_link param), so we fetch only this link's row instead of
    // every link on the post.
    const params = useMemo(() => ({
        site_uuid: statsConfig?.id || '',
        post_uuid: postUuid || '',
        gift_link: token || ''
    }), [statsConfig?.id, postUuid, token]);

    const {data, loading: queryLoading, error} = useTinybirdQuery({
        endpoint: 'api_gift_link_visits',
        statsConfig: statsConfig || {id: ''},
        params,
        enabled: enabled && webAnalyticsEnabled && Boolean(statsConfig?.id) && Boolean(postUuid) && Boolean(token)
    });

    // Treat a still-resolving prerequisite as loading, not as a resolved zero:
    // the query is disabled (loading:false) until config, settings, and the
    // token are all ready, so fold those pending states into `loading`.
    const loading = queryLoading || configLoading || settingsLoading || tokenLoading;

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
