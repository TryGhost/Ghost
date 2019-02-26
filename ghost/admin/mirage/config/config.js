import {Response} from 'ember-cli-mirage';
import {isEmpty} from '@ember/utils';

export default function mockConfig(server) {
    server.get('/config/', function ({db}, request) {
        if (!request.requestHeaders.Authorization) {
            return new Response(403, {}, {
                errors: [{
                    type: 'NoPermissionError',
                    message: 'Authorization failed',
                    context: 'Unable to determine the authenticated user or integration. Check that cookies are being passed through if using session authentication.'
                }]
            });
        }

        if (isEmpty(db.configs)) {
            server.loadFixtures('configs');
        }

        return {
            config: db.configs.find(1)
        };
    });

    server.get('/configuration/timezones/', function ({db}) {
        if (isEmpty(db.timezones)) {
            server.loadFixtures('timezones');
        }

        return {
            configuration: [{
                timezones: db.timezones
            }]
        };
    });
}
