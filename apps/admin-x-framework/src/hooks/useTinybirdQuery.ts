import {useQuery} from '@tinybirdco/charts';
import {useTinybirdToken} from './useTinybirdToken';
import {StatsConfig} from '../providers/FrameworkProvider';
import {getStatEndpointUrl} from '../utils/stats-config';

export interface UseTinybirdQueryOptions {
    statsConfig?: StatsConfig | null;
    endpoint: string;
    params: Record<string, string>;
    enabled?: boolean;
}

// Wrapper around Tinybird's useQuery hook that handles the token loading state
export const useTinybirdQuery = (options: UseTinybirdQueryOptions) => {
    const tokenQuery = useTinybirdToken();
    const {statsConfig, endpoint, params, enabled = true} = options;

    const shouldQuery = enabled && statsConfig && endpoint;
    const endpointUrl = shouldQuery ? getStatEndpointUrl(statsConfig, endpoint) : undefined;

    // Set the endpoint to undefined if:
    // - Token is not loaded (prevents 403 errors)
    // - Query is disabled via enabled flag
    // - No statsConfig provided
    // - No endpoint specified
    const {data, meta, loading, error} = useQuery({
        endpoint: (!tokenQuery.isLoading && tokenQuery.token && shouldQuery) ? endpointUrl : undefined,
        token: tokenQuery.token,
        params: params
    });

    return {
        data, 
        meta, 
        loading: tokenQuery.isLoading || loading, 
        error: error ?? tokenQuery.error
    };
};