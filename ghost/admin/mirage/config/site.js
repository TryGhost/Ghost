import {isEmpty} from '@ember/utils';

export default function mockSite(server) {
    server.get('/site/', function ({db}) {
        if (isEmpty(db.sites)) {
            server.loadFixtures('sites');
        }

        return {
            site: db.sites.find(1)
        };
    });
}
