import {expect, test} from '@playwright/test';
import {globalDataRequests, limitRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('User invitations', async () => {
    test('Supports inviting a user', async ({page}) => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            browseInvites: {method: 'GET', path: '/invites/?limit=100&include=roles', response: responseFixtures.invites},
            browseRoles: {method: 'GET', path: '/roles/?limit=100', response: responseFixtures.roles},
            browseAssignableRoles: {method: 'GET', path: '/roles/?limit=100&permissions=assign', response: responseFixtures.roles},
            addInvite: {method: 'POST', path: '/invites/', response: {
                invites: [
                    {
                        id: 'new-invite-id',
                        role_id: '645453f3d254799990dd0e18',
                        status: 'sent',
                        email: 'newuser@test.com',
                        expires: futureDate.getTime(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ],
                meta: {
                    pagination: {
                        page: 1,
                        limit: 100,
                        pages: 1,
                        total: 1,
                        next: null,
                        prev: null
                    }
                }
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');

        await section.getByRole('button', {name: 'Invite people'}).click();

        const modal = page.getByTestId('invite-user-modal');

        // Validation failures

        await modal.getByRole('button', {name: 'Send invitation'}).click();
        await expect(modal).toContainText('Please enter a valid email address');

        // Reset error with keydown event
        await modal.getByLabel('Email address').focus();
        await page.keyboard.press('Backspace');

        await modal.getByLabel('Email address').fill('test');
        await expect(modal).not.toContainText('Please enter a valid email address');
        await modal.getByRole('button', {name: 'Send invitation'}).click();
        await expect(modal).toContainText('Please enter a valid email address');

        await modal.getByLabel('Email address').fill('author@test.com');
        await modal.getByRole('button', {name: 'Retry'}).click();
        await expect(modal).toContainText('A user with that email address already exists.');

        await modal.getByLabel('Email address').fill('invitee@test.com');
        await modal.getByRole('button', {name: 'Retry'}).click();
        await expect(modal).toContainText('A user with that email address was already invited.');

        // Successful invitation

        await modal.getByLabel('Email address').fill('newuser@test.com');
        await modal.locator('button[value=author]').click();
        await modal.getByRole('button', {name: 'Retry'}).click();

        await expect(page.getByTestId('toast-success')).toHaveText(/Invitation sent/);

        await section.getByRole('tab', {name: 'Invited'}).click();

        const listItem = section.getByTestId('user-invite').last();

        await expect(listItem.getByText('newuser@test.com')).toBeVisible();
        await expect(listItem.getByText('Author')).toBeVisible();

        expect(lastApiRequests.addInvite?.body).toEqual({
            invites: [{
                email: 'newuser@test.com',
                expires: null,
                role_id: '645453f3d254799990dd0e18',
                status: null,
                token: null
            }]
        });
    });

    test('Supports resending invitations', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            browseInvites: {method: 'GET', path: '/invites/?limit=100&include=roles', response: responseFixtures.invites},
            deleteInvite: {method: 'DELETE', path: `/invites/${responseFixtures.invites.invites[0].id}/`, response: {}},
            addInvite: {method: 'POST', path: '/invites/', response: responseFixtures.invites}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        await section.getByRole('tab', {name: 'Invited'}).click();

        const listItem = section.getByTestId('user-invite');
        await listItem.hover();

        await listItem.getByRole('button', {name: 'Resend'}).click();

        await expect(page.getByTestId('toast-success')).toHaveText(/Invitation resent/);

        // Resending works by deleting and re-adding the invite

        expect(lastApiRequests.deleteInvite?.url).toMatch(new RegExp(`/invites/${responseFixtures.invites.invites[0].id}`));

        expect(lastApiRequests.addInvite?.body).toEqual({
            invites: [{
                email: 'invitee@test.com',
                expires: null,
                role_id: '645453f3d254799990dd0e18',
                status: null,
                token: null
            }]
        });
    });

    test('Supports revoking invitations', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            browseInvites: {method: 'GET', path: '/invites/?limit=100&include=roles', response: responseFixtures.invites},
            deleteInvite: {method: 'DELETE', path: `/invites/${responseFixtures.invites.invites[0].id}/`, response: {}}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        await section.getByRole('tab', {name: 'Invited'}).click();

        const listItem = section.getByTestId('user-invite');
        await listItem.hover();

        await listItem.getByRole('button', {name: 'Revoke'}).click();

        await expect(page.getByTestId('toast-success')).toHaveText(/Invitation revoked/);

        expect(lastApiRequests.deleteInvite?.url).toMatch(new RegExp(`/invites/${responseFixtures.invites.invites[0].id}`));
    });

    test('Supports load more functionality for invites', async ({page}) => {
        // Create a paginated response with multiple pages
        const firstPageInvites = {
            invites: [
                {
                    id: 'invite-1',
                    role_id: '645453f3d254799990dd0e18',
                    status: 'sent',
                    email: 'invitee1@test.com',
                    expires: 1687655172000,
                    created_at: '2023-06-23T00:30:21.000Z',
                    updated_at: '2023-06-23T00:30:21.000Z'
                },
                {
                    id: 'invite-2',
                    role_id: '645453f3d254799990dd0e18',
                    status: 'sent',
                    email: 'invitee2@test.com',
                    expires: 1687655172000,
                    created_at: '2023-06-23T00:30:21.000Z',
                    updated_at: '2023-06-23T00:30:21.000Z'
                }
            ],
            meta: {
                pagination: {
                    page: 1,
                    limit: 2,
                    pages: 2,
                    total: 3,
                    next: 2,
                    prev: null
                }
            }
        };

        const secondPageInvites = {
            invites: [
                {
                    id: 'invite-3',
                    role_id: '645453f3d254799990dd0e18',
                    status: 'sent',
                    email: 'invitee3@test.com',
                    expires: 1687655172000,
                    created_at: '2023-06-23T00:30:21.000Z',
                    updated_at: '2023-06-23T00:30:21.000Z'
                }
            ],
            meta: {
                pagination: {
                    page: 2,
                    limit: 2,
                    pages: 2,
                    total: 3,
                    next: null,
                    prev: 1
                }
            }
        };

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
            browseInvites: {method: 'GET', path: '/invites/?limit=100&include=roles', response: firstPageInvites},
            browseInvitesPage2: {method: 'GET', path: '/invites/?limit=100&include=roles&page=2', response: secondPageInvites},
            browseRoles: {method: 'GET', path: '/roles/?limit=100', response: responseFixtures.roles}
        }});

        await page.goto('/');

        const section = page.getByTestId('users');
        await section.getByRole('tab', {name: 'Invited'}).click();

        // Initially should show 2 invites and load more button
        await expect(section.getByTestId('user-invite')).toHaveCount(2);
        await expect(section.getByText('invitee1@test.com')).toBeVisible();
        await expect(section.getByText('invitee2@test.com')).toBeVisible();

        // Verify the tab count shows the total (3) even though only 2 are loaded
        await expect(section.getByRole('tab', {name: 'Invited'})).toContainText('Invited3');
        
        const loadMoreButton = section.getByRole('button', {name: /Load more \(showing 2\/3 invites\)/});
        await expect(loadMoreButton).toBeVisible();

        // Click load more button
        await loadMoreButton.click();

        // Should now show all 3 invites and button should be hidden
        await expect(section.getByTestId('user-invite')).toHaveCount(3);
        await expect(section.getByText('invitee3@test.com')).toBeVisible();
        await expect(loadMoreButton).not.toBeVisible();

        // Verify the API request was made for the second page
        expect(lastApiRequests.browseInvitesPage2?.url).toMatch(/\/invites\/\?limit=100&include=roles&page=2/);
    });

    test('Limits inviting too many staff users', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseAssignableRoles: {method: 'GET', path: '/roles/?limit=100&permissions=assign', response: responseFixtures.roles},
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

        await section.getByRole('button', {name: 'Invite people'}).click();

        const modal = page.getByTestId('invite-user-modal');

        await modal.locator('button[value=author]').click();

        await expect(modal).toHaveText(/Your plan does not support more staff/);

        await modal.locator('button[value=contributor]').click();

        await expect(modal).not.toHaveText(/Your plan does not support more staff/);
    });    
});
