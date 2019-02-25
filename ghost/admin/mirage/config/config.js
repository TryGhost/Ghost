import {isEmpty} from '@ember/utils';

export default function mockConfig(server) {
    server.get('/config/', function ({db}) {
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
