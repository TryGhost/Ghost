import {StatsConfig} from '../providers/FrameworkProvider';
import {getTinybirdToken} from '../api/tinybird';

export const getStatEndpointUrl = (config: StatsConfig, endpoint: string, params = '') => {
    const endpointUrl = config?.stats?.endpoint || 'https://api.tinybird.co';
    return `${endpointUrl}/v0/pipes/${endpoint}.json?${params}`;
};

export const getToken = () => {
    const tinybirdQuery = getTinybirdToken();
    const apiToken = tinybirdQuery.data?.tinybird?.token;
    
    return (apiToken && typeof apiToken === 'string') ? apiToken : undefined;
};