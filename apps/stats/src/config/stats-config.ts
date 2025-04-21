import {StatsConfig} from '@src/providers/GlobalDataProvider';

export const TB_VERSION = 8;

export const getStatEndpointUrl = (config?: StatsConfig | null, endpoint?: string, params = '') => {
    if (!config) {
        return '';
    }

    return config.local?.enabled ? 
        `${config.local?.endpoint || ''}/v0/pipes/${endpoint}.json?${params}` : 
        `${config.endpoint || ''}/v0/pipes/${endpoint}__v${TB_VERSION}.json?${params}`;
};