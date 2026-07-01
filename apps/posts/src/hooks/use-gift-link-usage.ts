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

// Reads gift-link usage (visits/views) from the web-analytics pipeline, keyed
// on the link token via api_gift_link_visits' exact-match filter.
//
// Two states the caller must not confuse:
//   - `usage` is `undefined` when there's nothing to show — analytics off, no
//     token, or the query errored — so the caller hides the count.
//   - `usage` is `{visits: 0, ...}` only when the query actually ran and
//     found zero.
// `loading` and `error` cover every prerequisite, not just the Tinybird query:
// the token comes from a separate active-link lookup (passed in as `tokenLoading`
// / `tokenError`), and until it resolves the query is disabled and reports
// loading:false / error:null — otherwise indistinguishable from a resolved zero,
// so the card would flash "0" while a link's token is still loading or after the
// lookup fails.
export const useGiftLinkUsage = ({postUuid, token, tokenLoading = false, tokenError = null, enabled = true}: {
    postUuid?: string;
    token?: string;
    tokenLoading?: boolean;
    tokenError?: unknown;
    enabled?: boolean;
}) => {
    const {data: configData, isLoading: configLoading} = useBrowseConfig();
    const statsConfig = configData?.config?.stats as StatsConfig | undefined;

    const {data: settingsData, isLoading: settingsLoading} = useBrowseSettings();
    const webAnalyticsEnabled = getSettingValue<boolean>(settingsData?.settings ?? null, 'web_analytics_enabled') ?? false;

    const params = useMemo(() => ({
        site_uuid: statsConfig?.id || '',
        post_uuid: postUuid || '',
        gift_link: token || ''
    }), [statsConfig?.id, postUuid, token]);

    const {data, loading: queryLoading, error: queryError} = useTinybirdQuery({
        endpoint: 'api_gift_link_visits',
        statsConfig: statsConfig || {id: ''},
        params,
        enabled: enabled && webAnalyticsEnabled && Boolean(statsConfig?.id) && Boolean(postUuid) && Boolean(token)
    });

    // The token comes from a separate upstream lookup, so fold its pending and
    // failed states in too: a disabled query reads loading:false / error:null,
    // which the caller would otherwise treat as a resolved zero.
    const loading = queryLoading || configLoading || settingsLoading || tokenLoading;
    const error = queryError || tokenError || null;

    const usage = useMemo<GiftLinkUsage | undefined>(() => {
        // Nothing to show (analytics off, no token, error, or query not run) →
        // undefined, distinct from a resolved {visits: 0}.
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
