import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../utils/acceptance';
import {meWithRole, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

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

    test('Authors can only see their own profile', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseMe: {...globalDataRequests.browseMe, response: meWithRole('Author')}
        }});

        await page.goto('/');

        await expect(page.getByTestId('user-detail-modal')).toBeVisible();
        await expect(page.getByTestId('sidebar')).toBeHidden();
        await expect(page.getByTestId('users')).toBeHidden();
        await expect(page.getByTestId('title-and-description')).toBeHidden();

        expect(page.url()).toMatch(/\/owner$/);
    });

    test('Contributors can only see their own profile', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseMe: {...globalDataRequests.browseMe, response: meWithRole('Contributor')}
        }});

        await page.goto('/');

        await expect(page.getByTestId('user-detail-modal')).toBeVisible();
        await expect(page.getByTestId('sidebar')).toBeHidden();
        await expect(page.getByTestId('users')).toBeHidden();
        await expect(page.getByTestId('title-and-description')).toBeHidden();

        expect(page.url()).toMatch(/\/owner$/);
    });
});
