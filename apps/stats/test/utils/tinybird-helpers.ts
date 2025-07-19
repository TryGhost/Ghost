import 'dotenv/config';
import {globalDataRequests, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

export const tinybirdConfig = {
    tinybird: {
        token: process.env.STATS_LOCAL_TOKEN
    }
};

export const statsConfig = {
    endpoint: process.env.STATS_ENDPOINT,
    token: process.env.STATS_TOKEN,
    id: process.env.STATS_ID,
    local: {
        enabled: true,
        token: process.env.STATS_LOCAL_TOKEN,
        endpoint: process.env.STATS_LOCAL_ENDPOINT,
        datasource: process.env.STATS_LOCAL_DATASOURCE
    }
};

export function mockedRequests(siteUuid: string) {
    return {
        ...globalDataRequests,
        browseConfig: {
            method: 'GET', path: '/config/', response: {
                config: {
                    ...responseFixtures.config.config,
                    stats: {
                        ...statsConfig,
                        id: siteUuid
                    }
                }
            }
        },
        browseTinyBirdToken: {
            method: 'GET',
            path: /^\/tinybird\/token\//,
            response: tinybirdConfig
        }
    };
}
