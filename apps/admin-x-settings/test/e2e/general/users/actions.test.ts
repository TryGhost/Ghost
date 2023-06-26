import {expect, test} from '@playwright/test';
import {mockApi, responseFixtures} from '../../../utils/e2e';

test.describe('User actions', async () => {
    test('Supports suspending a user', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            users: {
                edit: {
                    users: [{
                        ...responseFixtures.users.users.find(user => user.email === 'author@test.com')!,
                        status: 'inactive'
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

        await modal.getByRole('button', {name: 'Actions'}).click();
        await modal.getByRole('button', {name: 'Suspend user'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await confirmation.getByRole('button', {name: 'Suspend'}).click();

        await expect(modal).toHaveText(/Suspended/);

        expect(lastApiRequests.users.edit.body).toMatchObject({
            users: [{
                email: 'author@test.com',
                status: 'inactive'
            }]
        });
    });

    test('Supports un-suspending a user', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            users: {
                browse: {
                    users: [
                        ...responseFixtures.users.users.filter(user => user.email !== 'author@test.com'),
                        {
                            ...responseFixtures.users.users.find(user => user.email === 'author@test.com')!,
                            status: 'inactive'
                        }
                    ]
                },
                edit: {
                    users: [{
                        ...responseFixtures.users.users.find(user => user.email === 'author@test.com')!,
                        status: 'active'
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

        await expect(modal).toHaveText(/Suspended/);

        await modal.getByRole('button', {name: 'Actions'}).click();
        await modal.getByRole('button', {name: 'Un-suspend user'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await confirmation.getByRole('button', {name: 'Un-suspend'}).click();

        await expect(modal).not.toHaveText(/Suspended/);

        expect(lastApiRequests.users.edit.body).toMatchObject({
            users: [{
                email: 'author@test.com',
                status: 'active'
            }]
        });
    });

    test('Supports deleting a user', async ({page}) => {
        const authorUser = responseFixtures.users.users.find(user => user.email === 'author@test.com')!;

        const lastApiRequests = await mockApi({page});

        await page.goto('/');

        const section = page.getByTestId('users');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');

        await section.getByRole('tab', {name: 'Authors'}).click();

        const listItem = activeTab.getByTestId('user-list-item').last();
        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        const modal = page.getByTestId('user-detail-modal');

        await modal.getByRole('button', {name: 'Actions'}).click();
        await modal.getByRole('button', {name: 'Delete user'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await confirmation.getByRole('button', {name: 'Delete user'}).click();

        await expect(page.getByTestId('toast')).toHaveText(/User deleted/);
        await expect(activeTab.getByTestId('user-list-item')).toHaveCount(0);

        expect(lastApiRequests.users.delete.url).toMatch(new RegExp(`/users/${authorUser.id}`));
    });

    test('Supports transferring ownership to an administrator', async ({page}) => {
        const administrator = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;

        const lastApiRequests = await mockApi({page, responses: {
            users: {
                makeOwner: {
                    users: [
                        ...responseFixtures.users.users.filter(user => user.email !== 'administrator@test.com' && user.email !== 'owner@test.com'),
                        {
                            ...administrator,
                            roles: [responseFixtures.roles.roles.find(role => role.name === 'Owner')!]
                        },
                        {
                            ...responseFixtures.users.users.find(user => user.email === 'owner@test.com')!,
                            roles: [responseFixtures.roles.roles.find(role => role.name === 'Administrator')!]
                        }
                    ]
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        const activeTab = section.locator('[role=tabpanel]:not(.hidden)');
        const listItem = activeTab.getByTestId('user-list-item').last();
        const modal = page.getByTestId('user-detail-modal');

        // Can't transfer to a role other than administrator

        await section.getByRole('tab', {name: 'Editors'}).click();

        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        await modal.getByRole('button', {name: 'Actions'}).click();
        await expect(modal.getByRole('button', {name: 'Make owner'})).toHaveCount(0);

        await modal.getByRole('button', {name: 'Close'}).click();

        // Can transfer to an administrator

        await section.getByRole('tab', {name: 'Administrators'}).click();

        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        await modal.getByRole('button', {name: 'Actions'}).click();
        await modal.getByRole('button', {name: 'Make owner'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await confirmation.getByRole('button', {name: 'Yep — I\'m sure'}).click();

        await expect(page.getByTestId('toast')).toHaveText(/Ownership transferred/);

        await expect(section.getByTestId('owner-user')).toHaveText(/administrator@test\.com/);

        expect(lastApiRequests.users.makeOwner.body).toMatchObject({
            owner: [{
                id: administrator.id
            }]
        });
    });
});
