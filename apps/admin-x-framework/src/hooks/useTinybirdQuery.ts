import {useQuery} from '@tinybirdco/charts';
import {useTinybirdToken} from './useTinybirdToken';
import {useFakeTinybirdData} from './useFakeTinybirdData';
import {StatsConfig, useFramework} from '../providers/FrameworkProvider';
import {getStatEndpointUrl} from '../utils/stats-config';

export interface UseTinybirdQueryOptions {
    statsConfig?: StatsConfig | null;
    endpoint: string;
    params: Record<string, string>;
    enabled?: boolean;
}

// Wrapper around Tinybird's useQuery hook that handles the token loading state and fake data
export const useTinybirdQuery = <T = Record<string, unknown>>(options: UseTinybirdQueryOptions) => {
    const tokenQuery = useTinybirdToken();
    const {fakeDataConfig} = useFramework();
    const {statsConfig, endpoint, params, enabled = true} = options;

    // Handle fake data
    const {fakeData, fakeLoading, fakeError, hasFakeData} = useFakeTinybirdData({
        fakeDataConfig,
        enabled,
        endpoint,
        params
    });

    // Always call useQuery hook (required by React Hooks rules)
    const shouldQuery = enabled && statsConfig && endpoint && !hasFakeData;
    const endpointUrl = shouldQuery ? getStatEndpointUrl(statsConfig, endpoint) : undefined;

    // Set the endpoint to undefined if:
    // - Token is not loaded (prevents 403 errors)
    // - Query is disabled via enabled flag
    // - No statsConfig provided
    // - No endpoint specified
    // - Fake data is enabled
    const {data, meta, loading, error} = useQuery({
        endpoint: (!tokenQuery.isLoading && tokenQuery.token && shouldQuery) ? endpointUrl : undefined,
        token: tokenQuery.token,
        params: params
    });

    // Return fake data if enabled
    if (hasFakeData) {
        return {
            data: fakeData?.data as T[],
            meta: fakeData?.meta,
            loading: fakeLoading,
            error: fakeError
        };
    }

    // Otherwise, return real Tinybird query results
    return {
        data: data as T[], 
        meta, 
        loading: tokenQuery.isLoading || loading, 
        error: error ?? tokenQuery.error
    };
};