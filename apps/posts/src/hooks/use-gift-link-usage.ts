import {StatsConfig, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useMemo} from 'react';

export interface GiftLinkUsage {
    visits: number;
    views: number;
}

interface GiftLinkVisitsRow {
    gift: string;
    visits: number | string;
    views: number | string;
}

// Reads gift-link usage from the web-analytics pipeline (the same Tinybird
// mechanism every other analytics surface uses), keyed on the link token.
//
// Usage tracking is best-effort and entirely optional: analytics may be turned
// off (no statsConfig) or the query may error. In either case `usage` is
// `undefined` and the caller simply hides the count — the rest of the gift-link
// UI keeps working.
export const useGiftLinkUsage = ({postUuid, token, enabled = true}: {
    postUuid?: string;
    token?: string;
    enabled?: boolean;
}) => {
    const {data: configData} = useBrowseConfig();
    const statsConfig = configData?.config?.stats as StatsConfig | undefined;

    const params = useMemo(() => ({
        site_uuid: statsConfig?.id || '',
        post_uuid: postUuid || ''
    }), [statsConfig?.id, postUuid]);

    const {data, loading, error} = useTinybirdQuery({
        endpoint: 'api_gift_link_visits',
        statsConfig: statsConfig || {id: ''},
        params,
        enabled: enabled && Boolean(statsConfig?.id) && Boolean(postUuid)
    });

    const usage = useMemo<GiftLinkUsage | undefined>(() => {
        // No token yet, the query is disabled/loading, or it errored → no data
        // to show. Distinct from "ran and found zero", which yields {visits: 0}.
        if (!token || error || !Array.isArray(data)) {
            return undefined;
        }
        const row = (data as unknown as GiftLinkVisitsRow[]).find(r => r.gift === token);
        return {
            visits: Number(row?.visits) || 0,
            views: Number(row?.views) || 0
        };
    }, [data, token, error]);

    return {usage, loading};
};
