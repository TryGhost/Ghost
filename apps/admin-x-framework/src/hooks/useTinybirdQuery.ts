import {useQuery} from '@tinybirdco/charts';
import {useTinybirdToken} from './useTinybirdToken';
import {StatsConfig} from '../providers/FrameworkProvider';
import {getStatEndpointUrl} from '../utils/stats-config';

interface UseTinybirdQueryOptions {
    statsConfig: StatsConfig;
    endpoint: string;
    params: Record<string, string>;
}

// Wrapper around Tinybird's useQuery hook that handles the token loading state
export const useTinybirdQuery = (options: UseTinybirdQueryOptions) => {
    const tokenQuery = useTinybirdToken();
    const {statsConfig, endpoint, params} = options;

    const endpointUrl = getStatEndpointUrl(statsConfig || undefined, endpoint);

    // Set the endpoint to undefined if the token is not loaded
    // Prevents an initial 403 error by waiting for the token to load before making the request
    const {data, meta, loading, error} = useQuery({
        endpoint: (!tokenQuery.isLoading && tokenQuery.token) ? endpointUrl : undefined,
        token: tokenQuery.token,
        params: params
    });

    return {data, meta, loading: tokenQuery.isLoading || loading, error};
};