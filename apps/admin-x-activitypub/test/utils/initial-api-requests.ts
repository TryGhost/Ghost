import activityPubUser from './responses/activitypub/users.json';
import identities from './responses/ghost/identities.json';
import ownerUser from './responses/ghost/users.json';
import site from './responses/ghost/site.json';
import {Page} from '@playwright/test';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';

const initialAdminApiRequests = {
    getStaffUser: {
        method: 'GET',
        path: /users\/me\/?(\?.*)?/,
        response: ownerUser
    },
    getSite: {
        method: 'GET',
        path: '/site',
        response: site
    },
    getIdentities: {
        method: 'GET',
        path: '/identities/',
        response: identities
    }
};

const initialActivityPubRequests = {
    getActivityPubUser: {
        method: 'GET',
        path: '/users/index',
        response: activityPubUser
    }
};

export async function mockInitialApiRequests(page: Page) {
    await mockApi({page, requests: initialAdminApiRequests});
    await mockApi({page, requests: initialActivityPubRequests, options: {useActivityPub: true}});
}
