import {expect, test} from '@playwright/test';
import {mockApi, responseFixtures} from '../../../utils/e2e';

test.describe('User invitations', async () => {
    test('Supports inviting a user', async ({page}) => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        const lastApiRequests = await mockApi({page, responses: {
            invites: {
                add: {
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
                    ]
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('users');

        await section.getByRole('button', {name: 'Invite users'}).click();

        const modal = page.getByTestId('invite-user-modal');
        await modal.getByLabel('Email address').fill('newuser@test.com');
        await modal.locator('input[value=author]').check();
        await modal.getByRole('button', {name: 'Send invitation now'}).click();

        await expect(page.getByTestId('toast')).toHaveText(/Invitation successfully sent to newuser@test\.com/);

        // Currently clicking the backdrop is the only way to close this modal
        await page.locator('#modal-backdrop').click({position: {x: 0, y: 0}});

        await section.getByRole('tab', {name: 'Invited'}).click();

        const listItem = section.getByTestId('user-invite').last();

        await expect(listItem.getByText('newuser@test.com')).toBeVisible();
        await expect(listItem.getByText('Author')).toBeVisible();

        expect(lastApiRequests.invites.add.body).toEqual({
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
        const lastApiRequests = await mockApi({page});

        await page.goto('/');

        const section = page.getByTestId('users');
        await section.getByRole('tab', {name: 'Invited'}).click();

        const listItem = section.getByTestId('user-invite');
        await listItem.hover();

        await listItem.getByRole('button', {name: 'Resend'}).click();

        await expect(page.getByTestId('toast')).toHaveText(/Invitation resent! \(invitee@test\.com\)/);

        // Resending works by deleting and re-adding the invite

        expect(lastApiRequests.invites.delete.url).toMatch(new RegExp(`/invites/${responseFixtures.invites.invites[0].id}`));

        expect(lastApiRequests.invites.add.body).toEqual({
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
        const lastApiRequests = await mockApi({page});

        await page.goto('/');

        const section = page.getByTestId('users');
        await section.getByRole('tab', {name: 'Invited'}).click();

        const listItem = section.getByTestId('user-invite');
        await listItem.hover();

        await listItem.getByRole('button', {name: 'Revoke'}).click();

        await expect(page.getByTestId('toast')).toHaveText(/Invitation revoked \(invitee@test\.com\)/);

        expect(lastApiRequests.invites.delete.url).toMatch(new RegExp(`/invites/${responseFixtures.invites.invites[0].id}`));
    });
});
