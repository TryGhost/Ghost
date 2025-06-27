import {StatsConfig} from '../providers/FrameworkProvider';
import {getTinybirdToken} from '../api/tinybird';

export const getStatEndpointUrl = (config?: StatsConfig | null, endpoint?: string, params = '') => {
    if (!config) {
        return '';
    }

    return config.local?.enabled ?
        `${config.local?.endpoint || ''}/v0/pipes/${endpoint}.json?${params}` :
        `${config.endpoint || ''}/v0/pipes/${endpoint}.json?${params}`;
};

export const getToken = (config?: StatsConfig) => {
    // Try to get token from getTinybirdToken first
    const tinybirdQuery = getTinybirdToken();
    const apiToken = tinybirdQuery.data?.tinybird?.token;
    
    if (apiToken && typeof apiToken === 'string') {
        return apiToken;
    }
    
    // Fallback to config-based token
    return config?.local?.enabled ? config?.local?.token : config?.token;
}; 