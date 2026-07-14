import activityPubUser from './responses/activitypub/users.json' with {type: 'json'};
import identities from './responses/ghost/identities.json' with {type: 'json'};
import ownerUser from './responses/ghost/users.json' with {type: 'json'};
import site from './responses/ghost/site.json' with {type: 'json'};
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
        path: '/site/',
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
    },
    getActivityPubAccount: {
        method: 'GET',
        path: '/v1/account/me',
        response: {
            id: 'index',
            handle: '@index@example.com',
            name: 'Test User',
            url: 'https://example.com/@index',
            avatarUrl: null,
            bannerImageUrl: null,
            followingCount: 0,
            followerCount: 0,
            likedCount: 0
        }
    }
};

export async function mockInitialApiRequests(page: Page) {
    await mockApi({page, requests: initialAdminApiRequests});
    await mockApi({page, requests: initialActivityPubRequests, options: {useActivityPub: true}});
}
