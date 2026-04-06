import {StatsConfig} from '../providers/framework-provider';
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

    // Append version suffix if provided (e.g., "v2" -> "api_kpis_v2")
    const finalEndpointName = config.version ? `${endpointName}_${config.version}` : endpointName;

    return `${baseUrl}/v0/pipes/${finalEndpointName}.json?${params}`;
};

export const getToken = () => {
    // Get token from getTinybirdToken API - options are now built-in
    const tinybirdQuery = getTinybirdToken();
    const apiToken = tinybirdQuery.data?.tinybird?.token;

    return (apiToken && typeof apiToken === 'string') ? apiToken : undefined;
};
