import {useQuery} from '@tinybirdco/charts';
import {useTinybirdToken} from './use-tinybird-token';
import {StatsConfig} from '../providers/framework-provider';
import {getStatEndpointUrl} from '../utils/stats-config';

export interface UseTinybirdQueryOptions {
    statsConfig?: StatsConfig | null;
    endpoint: string;
    params: Record<string, string>;
    enabled?: boolean;
}

// Wrapper around Tinybird's useQuery hook that handles the token loading state
export const useTinybirdQuery = (options: UseTinybirdQueryOptions) => {
    const {statsConfig, endpoint, params, enabled = true} = options;

    const shouldQuery = Boolean(enabled && statsConfig && endpoint);
    const tokenQuery = useTinybirdToken({enabled: shouldQuery});
    const endpointUrl = shouldQuery && statsConfig ? getStatEndpointUrl(statsConfig, endpoint) : undefined;

    // Set the endpoint to undefined if:
    // - Token is not loaded (prevents 403 errors)
    // - Query is disabled via enabled flag
    // - No statsConfig provided
    // - No endpoint specified
    const {data, meta, loading, error} = useQuery({
        endpoint: (!tokenQuery.isLoading && tokenQuery.token && shouldQuery) ? endpointUrl : undefined,
        token: shouldQuery ? tokenQuery.token : undefined,
        params: params
    });

    return {
        data: shouldQuery ? data : null,
        meta: shouldQuery ? meta : null,
        loading: shouldQuery ? tokenQuery.isLoading || loading : false,
        error: shouldQuery ? error ?? tokenQuery.error : null
    };
};
