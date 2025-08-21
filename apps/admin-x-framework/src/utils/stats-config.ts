import {StatsConfig} from '../providers/FrameworkProvider';
import {getTinybirdToken} from '../api/tinybird';

export const getStatEndpointUrl = (config?: StatsConfig | null, endpointName?: string, params = '') => {
    if (!config) {
        return '';
    }
    let baseUrl;
    if (config.local?.enabled) {
        baseUrl = config.local.endpoint || '';
    } else if (config.endpointBrowser) {
        baseUrl = config.endpointBrowser;
    } else {
        baseUrl = config.endpoint || '';
    }
    return `${baseUrl}/v0/pipes/${endpointName}.json?${params}`;
};

export const getToken = () => {
    // Get token from getTinybirdToken API - options are now built-in
    const tinybirdQuery = getTinybirdToken();
    const apiToken = tinybirdQuery.data?.tinybird?.token;

    return (apiToken && typeof apiToken === 'string') ? apiToken : undefined;
};
