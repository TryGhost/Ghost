import {expect, test} from '@playwright/test';
import {globalDataRequests, meWithRole, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('User permissions', async () => {
    test('Editors can only see users', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseMe: {...globalDataRequests.browseMe, response: meWithRole('Editor')},
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users}
        }});

        await page.goto('/');

        await expect(page.getByTestId('users')).toBeVisible();
        await expect(page.getByTestId('sidebar')).toBeHidden();
        await expect(page.getByTestId('title-and-description')).toBeHidden();
    });

    // Note: Author/Contributor redirect to profile is handled by the Ember router (settings-x.js),
    // not by the React app. These tests verify the UI renders correctly when on the profile route.
    test('Authors can only see their own profile', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseMe: {...globalDataRequests.browseMe, response: meWithRole('Author')}
        }});

        // Navigate directly to profile route using hash-based routing
        // (Ember router handles redirect in production)
        await page.goto('/#/settings/staff/owner');

        await expect(page.getByTestId('user-detail-modal')).toBeVisible();
        await expect(page.getByTestId('sidebar')).toBeHidden();
        await expect(page.getByTestId('users')).toBeHidden();
        await expect(page.getByTestId('title-and-description')).toBeHidden();
    });

    test('Contributors can only see their own profile', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseMe: {...globalDataRequests.browseMe, response: meWithRole('Contributor')}
        }});

        // Navigate directly to profile route using hash-based routing
        // (Ember router handles redirect in production)
        await page.goto('/#/settings/staff/owner');

        await expect(page.getByTestId('user-detail-modal')).toBeVisible();
        await expect(page.getByTestId('sidebar')).toBeHidden();
        await expect(page.getByTestId('users')).toBeHidden();
        await expect(page.getByTestId('title-and-description')).toBeHidden();
    });
});
