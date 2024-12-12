import {responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

export const globalDataRequests = {
    browseSettings: {method: 'GET', path: /^\/settings\/\?group=/, response: responseFixtures.settings},
    browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
    browseSite: {method: 'GET', path: '/site/', response: responseFixtures.site},
    browseMe: {method: 'GET', path: '/users/me/?include=roles', response: responseFixtures.me}
};
