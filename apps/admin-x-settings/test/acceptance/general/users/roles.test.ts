import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../../utils/acceptance';
import {meWithRole, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('User roles', async () => {
    test('Shows users under their role', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');

        await expect(section.getByTestId('owner-user')).toHaveText(/owner@test\.com/);

        await expect(section.getByRole('tab')).toHaveText([
            'Administrators1',
            'Editors1',
            'Authors1',
            'Contributors1',
            'Invited'
        ]);

        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Administrators'}).click();
        await expect(activeTab.getByTestId('user-list-item')).toHaveText(/administrator@test\.com/);

        await section.getByRole('tab', {name: 'Editors'}).click();
        await expect(activeTab.getByTestId('user-list-item')).toHaveText(/editor@test\.com/);

        await section.getByRole('tab', {name: 'Authors'}).click();
        await expect(activeTab.getByTestId('user-list-item')).toHaveText(/author@test\.com/);

        await section.getByRole('tab', {name: 'Contributors'}).click();
        await expect(activeTab.getByTestId('user-list-item')).toHaveText(/contributor@test\.com/);
    });

    test('Supports changing user role', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'author@test.com')!;

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            browseRoles: {method: 'GET', path: '/roles/?limit=all', response: responseFixtures.roles},
            browseAssignableRoles: {method: 'GET', path: '/roles/?limit=all&permissions=assign', response: responseFixtures.roles},
            editUser: {method: 'PUT', path: `/users/${userToEdit.id}/?include=roles`, response: {
                users: [{
                    ...userToEdit,
                    roles: [responseFixtures.roles.roles.find(role => role.name === 'Editor')!]
                }]
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Authors'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('user-detail-modal');

        await modal.locator('input[value=editor]').check();

        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal.getByRole('button', {name: 'Saved'})).toBeVisible();

        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(activeTab).toHaveText(/No authors found./);

        await section.getByRole('tab', {name: 'Editors'}).click();

        await expect(activeTab.getByTestId('user-list-item')).toHaveCount(2);

        await expect(activeTab.getByTestId('user-list-item')).toHaveText([
            /author@test\.com/,
            /editor@test\.com/
        ]);

        expect(lastApiRequests.editUser?.body).toMatchObject({
            users: [{
                email: 'author@test.com',
                roles: [{
                    name: 'Editor'
                }]
            }]
        });
    });

    test('Editors can only manage lower roles', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'contributor@test.com')!;

        await mockApi({page, requests: {
            ...globalDataRequests,
            browseMe: {...globalDataRequests.browseMe, response: meWithRole('Editor')},
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            editUser: {method: 'PUT', path: `/users/${userToEdit.id}/?include=roles`, response: {
                users: [{
                    ...userToEdit,
                    name: 'New name'
                }]
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');
        const modal = page.getByTestId('user-detail-modal');

        // Cannot edit owner, administrators, other editors or authors

        await section.getByTestId('owner-user').hover();
        await expect(section.getByTestId('owner-user').getByRole('button')).toBeHidden();

        await section.getByRole('tab', {name: 'Administrators'}).click();

        await activeTab.getByTestId('user-list-item').last().click();
        await expect(modal).toBeHidden();

        await section.getByRole('tab', {name: 'Editors'}).click();

        await activeTab.getByTestId('user-list-item').last().click();
        await expect(modal).toBeHidden();

        await section.getByRole('tab', {name: 'Authors'}).click();

        await activeTab.getByTestId('user-list-item').last().click();
        await expect(modal).toBeHidden();

        // Can edit contributors

        await section.getByRole('tab', {name: 'Contributors'}).click();

        await activeTab.getByTestId('user-list-item').last().click();
        await expect(modal).toBeVisible();

        await expect(modal).not.toContainText('Role');

        await modal.getByLabel('Full name').fill('New name');
        await modal.getByRole('button', {name: 'Save'}).click();
        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(modal).toBeHidden();
    });
});
