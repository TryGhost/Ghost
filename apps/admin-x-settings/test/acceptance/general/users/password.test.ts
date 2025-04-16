import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../../utils/acceptance';
import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('User passwords', async () => {
    test('Supports changing password', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            updatePassword: {method: 'PUT', path: '/users/password/', response: {}}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Administrators'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('user-detail-modal');

        await modal.getByTestId('change-password-button').click();

        // Validation failures

        await modal.getByTestId('save-password-button').click();

        await expect(modal).toContainText('Password must be at least 10 characters long.');

        await modal.getByTestId('new-password').fill('1234567890');
        await modal.getByTestId('save-password-button').click();
        await expect(modal).not.toContainText('Sorry, you cannot use an insecure password.');

        await modal.getByTestId('new-password').fill('newpasshere');
        await modal.getByTestId('confirm-password').fill('notthesame');
        await modal.getByTestId('save-password-button').click();
        await expect(modal).toContainText('Your new passwords do not match');

        // Successful update

        await modal.getByTestId('new-password').fill('newpasshere');
        await modal.getByTestId('confirm-password').fill('newpasshere');

        await modal.getByTestId('save-password-button').click();

        await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

        expect(lastApiRequests.updatePassword?.body).toMatchObject({
            password: [{
                newPassword: 'newpasshere',
                ne2Password: 'newpasshere',
                oldPassword: '',
                user_id: responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!.id
            }]
        });
    });

    test('Requires current password when changing your own password', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            updatePassword: {method: 'PUT', path: '/users/password/', response: {}}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');

        const listItem = section.getByTestId('owner-user').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'View profile'}).click();

        const modal = page.getByTestId('user-detail-modal');

        await modal.getByTestId('change-password-button').click();

        // Validation failures

        await modal.getByTestId('save-password-button').click();
        await expect(modal).toContainText('Your current password is required to set a new one');

        await modal.getByTestId('old-password').fill('oldpass');
        await modal.getByTestId('save-password-button').click();
        await expect(modal).toContainText('Password must be at least 10 characters long.');

        await modal.getByTestId('old-password').fill('oldpass');
        await modal.getByTestId('new-password').fill('1234567890');
        await modal.getByTestId('save-password-button').click();
        await expect(modal).not.toContainText('Sorry, you cannot use an insecure password.');

        await modal.getByTestId('old-password').fill('oldpass');
        await modal.getByTestId('new-password').fill('newpasshere');
        await modal.getByTestId('confirm-password').fill('notthesame');
        await modal.getByTestId('save-password-button').click();
        await expect(modal).toContainText('Your new passwords do not match');

        // Successful update

        await modal.getByTestId('old-password').fill('oldpasshere');
        await modal.getByTestId('new-password').fill('newpasshere');
        await modal.getByTestId('confirm-password').fill('newpasshere');

        await modal.getByTestId('save-password-button').click();

        await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

        expect(lastApiRequests.updatePassword?.body).toMatchObject({
            password: [{
                newPassword: 'newpasshere',
                ne2Password: 'newpasshere',
                oldPassword: 'oldpasshere',
                user_id: responseFixtures.users.users.find(user => user.email === 'owner@test.com')!.id
            }]
        });
    });
});
