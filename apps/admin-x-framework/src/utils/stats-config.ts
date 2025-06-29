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

export const getToken = () => {
    // Get token from getTinybirdToken API only
    const tinybirdQuery = getTinybirdToken({
        refetchInterval: 120 * 60 * 1000, // 2 hours — tokens expire after 3 hours
        refetchIntervalInBackground: true,
        notifyOnChangeProps: [] // Never trigger re-renders
    });
    const apiToken = tinybirdQuery.data?.tinybird?.token;
    
    return (apiToken && typeof apiToken === 'string') ? apiToken : undefined;
}; 