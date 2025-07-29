import {expect, test} from '@playwright/test';
import {globalDataRequests, meWithRole, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('User security settings', async () => {
    test('Owners can see 2FA settings', async ({page}) => {
        // Mock the API with an editor user
        await mockApi({
            page, requests: {
                ...globalDataRequests,
                browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users}
            }
        });

        await page.goto('/');

        const section = page.getByTestId('users');
        await section.scrollIntoViewIfNeeded();

        // Verify the 2FA settings section is visible
        await expect(section.getByText('Security settings')).toBeVisible();
        await expect(section.getByText('Require email 2FA codes to be used on all staff logins')).toBeVisible();

        // Verify that the toggle is off
        await expect(section.getByRole('switch')).not.toBeChecked();
    });

    test('Admins can see 2FA settings', async ({page}) => {
        // Mock the API with an editor user
        await mockApi({
            page, requests: {
                ...globalDataRequests,
                browseMe: {...globalDataRequests.browseMe, response: meWithRole('Administrator')},
                browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users}
            }
        });

        await page.goto('/');

        const section = page.getByTestId('users');
        await section.scrollIntoViewIfNeeded();

        // Verify the 2FA settings section is visible
        await expect(section.getByText('Security settings')).toBeVisible();
        await expect(section.getByText('Require email 2FA codes to be used on all staff logins')).toBeVisible();

        // Verify that the toggle is off
        await expect(section.getByRole('switch')).not.toBeChecked();
    });

    test('Editor users cannot see 2FA settings', async ({page}) => {
        await mockApi({
            page, requests: {
                ...globalDataRequests,
                browseMe: {...globalDataRequests.browseMe, response: meWithRole('Editor')},
                browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users}
            }
        });

        await page.goto('/');

        const section = page.getByTestId('users');

        // Verify the 2FA settings section is not visible
        await expect(section.getByText('Security settings')).not.toBeVisible();
        await expect(section.getByText('Require email 2FA codes to be used on all staff logins')).not.toBeVisible();
    });
});
