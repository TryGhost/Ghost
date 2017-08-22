import {isEmpty} from '@ember/utils';

export default function mockConfiguration(server) {
    server.get('/configuration/', function ({db}) {
        if (isEmpty(db.configurations)) {
            server.loadFixtures('configurations');
        }

        return {
            configuration: [db.configurations.find(1)]
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

    server.get('/configuration/private/', function ({db}) {
        if (isEmpty(db.private)) {
            server.loadFixtures('private');
        }

        return {
            configuration: [db.private]
        };
    });
}
