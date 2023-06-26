import {expect, test} from '@playwright/test';
import {mockApi, responseFixtures} from '../../../utils/e2e';

test.describe('User roles', async () => {
    test('Shows users under their role', async ({page}) => {
        await mockApi({page});

        await page.goto('/');

        const section = page.getByTestId('users');

        await expect(section.getByTestId('owner-user')).toHaveText(/owner@test\.com/);

        await expect(section.getByRole('tab')).toHaveText([
            'Administrators',
            'Editors',
            'Authors',
            'Contributors',
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
        const lastApiRequests = await mockApi({page, responses: {
            users: {
                edit: {
                    users: [{
                        ...responseFixtures.users.users.find(user => user.email === 'author@test.com')!,
                        roles: [responseFixtures.roles.roles.find(role => role.name === 'Editor')!]
                    }]
                }
            }
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

        await expect(activeTab).toHaveText(/No users found/);

        await section.getByRole('tab', {name: 'Editors'}).click();

        await expect(activeTab.getByTestId('user-list-item')).toHaveCount(2);

        await expect(activeTab.getByTestId('user-list-item')).toHaveText([
            /author@test\.com/,
            /editor@test\.com/
        ]);

        expect(lastApiRequests.users.edit.body).toMatchObject({
            users: [{
                email: 'author@test.com',
                roles: [{
                    name: 'Editor'
                }]
            }]
        });
    });
});
