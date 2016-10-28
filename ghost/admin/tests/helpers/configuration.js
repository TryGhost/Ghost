import {isEmpty} from 'ember-utils';

export function enableGhostOAuth(server) {
    if (isEmpty(server.db.configurations)) {
        server.loadFixtures('configurations');
    }

    server.db.configurations.update(1, {
        ghostAuthId: '6e0704b3-c653-4c12-8da7-584232b5c629',
        ghostAuthUrl: 'http://devauth.ghost.org:8080'
    });
}
