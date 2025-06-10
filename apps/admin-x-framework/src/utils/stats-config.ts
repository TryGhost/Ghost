import {StatsConfig} from '../providers/FrameworkProvider';

export const getStatEndpointUrl = (config?: StatsConfig | null, endpoint?: string, params = '') => {
    if (!config) {
        return '';
    }

    return config.local?.enabled ?
        `${config.local?.endpoint || ''}/v0/pipes/${endpoint}.json?${params}` :
        `${config.endpoint || ''}/v0/pipes/${endpoint}.json?${params}`;
};

export const getToken = (config?: StatsConfig) => {
    return config?.local?.enabled ? config?.local?.token : config?.token;
}; 