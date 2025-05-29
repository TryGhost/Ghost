import identities from './responses/ghost/identities.json';
import site from './responses/ghost/site.json';
import usersMe from './responses/ghost/users-me.json';
import {Page} from '@playwright/test';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';

const initialAdminApiRequests = {
    getCurrentUser: {
        method: 'GET' as const,
        path: '/users/me',
        response: usersMe
    },
    getSite: {
        method: 'GET' as const,
        path: '/site',
        response: site
    },
    getIdentities: {
        method: 'GET' as const,
        path: '/identities/',
        response: identities
    }
};

export async function mockInitialApiRequests(page: Page) {
    await mockApi({page, requests: initialAdminApiRequests});
}
