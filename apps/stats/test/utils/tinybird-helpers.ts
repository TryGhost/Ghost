import 'dotenv/config';
import {globalDataRequests, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

export const tinybirdConfig = {
    tinybird: {
        token: 'token'
    }
};

export const statsConfig = {
    endpoint: 'https://api.tinybird.co',
    token: 'token',
    id: 'id',
    local: {
        enabled: true,
        token: 'token',
        endpoint: 'http://localhost',
        datasource: 'analytics'
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
