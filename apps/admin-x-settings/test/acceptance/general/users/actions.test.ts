import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../../utils/acceptance';
import {limitRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('User actions', async () => {
    test('Supports suspending a user', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'author@test.com')!;

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            editUser: {method: 'PUT', path: `/users/${userToEdit.id}/?include=roles`, response: {
                users: [{
                    ...userToEdit,
                    status: 'inactive'
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

        await modal.getByRole('button', {name: 'Actions'}).click();
        await page.getByTestId('popover-content').getByRole('button', {name: 'Suspend user'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await confirmation.getByRole('button', {name: 'Suspend'}).click();

        await expect(modal).toHaveText(/Suspended/);

        expect(lastApiRequests.editUser?.body).toMatchObject({
            users: [{
                email: 'author@test.com',
                status: 'inactive'
            }]
        });
    });

    test('Supports un-suspending a user', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'author@test.com')!;

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: {
                users: [
                    ...responseFixtures.users.users.filter(user => user.email !== 'author@test.com'),
                    {
                        ...userToEdit,
                        status: 'inactive'
                    }
                ]
            }},
            editUser: {method: 'PUT', path: `/users/${userToEdit.id}/?include=roles`, response: {
                users: [{
                    ...userToEdit,
                    status: 'active'
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

        await expect(modal).toHaveText(/Suspended/);

        await modal.getByRole('button', {name: 'Actions'}).click();
        await page.getByTestId('popover-content').getByRole('button', {name: 'Un-suspend user'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await confirmation.getByRole('button', {name: 'Un-suspend'}).click();

        await expect(modal).not.toHaveText(/Suspended/);

        expect(lastApiRequests.editUser?.body).toMatchObject({
            users: [{
                email: 'author@test.com',
                status: 'active'
            }]
        });
    });

    test('Supports deleting a user', async ({page}) => {
        const authorUser = responseFixtures.users.users.find(user => user.email === 'author@test.com')!;

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            deleteUser: {method: 'DELETE', path: `/users/${authorUser.id}/`, response: {}}
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
        await page.getByTestId('popover-content').getByRole('button', {name: 'Delete user'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await confirmation.getByRole('button', {name: 'Delete user'}).click();

        await expect(page.getByTestId('toast-success')).toHaveText(/User deleted/);
        await expect(activeTab.getByTestId('user-tabview')).toHaveCount(0);

        expect(lastApiRequests.deleteUser?.url).toMatch(new RegExp(`/users/${authorUser.id}`));
    });

    test('Supports transferring ownership to an administrator', async ({page}) => {
        const administrator = responseFixtures.users.users.find(user => user.email === 'administrator@test.com')!;

        const makeOwnerResponse = {
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
        };

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            editUser: {method: 'PUT', path: /^\/users\/\w{24}\/\?include=roles$/, response: responseFixtures.users},
            makeOwner: {method: 'PUT', path: '/users/owner/', response: makeOwnerResponse}
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
        await expect(page.getByTestId('popover-content').getByRole('button', {name: 'Make owner'})).toHaveCount(0);
        await modal.getByRole('button', {name: 'Actions'}).click();

        await modal.getByRole('button', {name: 'Close'}).click();

        // Can transfer to an administrator

        await section.getByRole('tab', {name: 'Administrators'}).click();

        await listItem.hover();
        await listItem.getByRole('button', {name: 'Edit'}).click();

        await modal.getByRole('button', {name: 'Actions'}).click();
        await page.getByTestId('popover-content').getByRole('button', {name: 'Make owner'}).click();

        const confirmation = page.getByTestId('confirmation-modal');
        await confirmation.getByRole('button', {name: 'Yep — I\'m sure'}).click();

        await expect(page.getByTestId('toast-success')).toHaveText(/Ownership transferred/);

        await expect(section.getByTestId('owner-user')).toHaveText(/administrator@test\.com/);

        expect(lastApiRequests.makeOwner?.body).toMatchObject({
            owner: [{
                id: administrator.id
            }]
        });
    });

    test('Limits un-suspending a user when there are too many users', async ({page}) => {
        const userToEdit = responseFixtures.users.users.find(user => user.email === 'author@test.com')!;

        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: {
                users: [
                    ...responseFixtures.users.users.filter(user => user.email !== 'author@test.com'),
                    {
                        ...userToEdit,
                        status: 'inactive'
                    }
                ]
            }},
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                staff: {
                                    max: 1,
                                    error: 'Your plan does not support more staff'
                                }
                            }
                        }
                    }
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
        await page.getByTestId('popover-content').getByRole('button', {name: 'Un-suspend user'}).click();

        await expect(page.getByTestId('limit-modal')).toHaveText(/Your plan does not support more staff/);
    });
});
