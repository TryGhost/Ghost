const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');

/**
 * @param {import('@playwright/test').Page} page
 */
test.describe('Portal', () => {
    test.describe('Invites', () => {
        test('Send invitation to a new staff member', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');
            await sharedPage.locator('[data-test-nav="settings"]').click();
            await sharedPage.waitForLoadState('networkidle');
            
            //Send invitation to a new staff member
            await sharedPage.getByRole('button', {name: 'Invite people'}).click();
            await sharedPage.getByPlaceholder('jamie@example.com').fill('vershwal.princi@gmail.com');
            await sharedPage.getByRole('button', { name: 'Send invitation' }).click();

            // Wait for the network request to complete
            await sharedPage.waitForLoadState('networkidle');

            
            // Check if the invitation was sent
            const invitedEmail = sharedPage.getByText('Invitation sent', {exact: true});
            await expect(invitedEmail).toBeVisible({timeout: 5000});
            
            // Check for other elements after confirming that the invitation was sent
            await sharedPage.getByTestId('user-invite').getByText('vershwal.princi@gmail.com').hover();
            await expect(sharedPage.getByRole('button', {name: 'Revoke'})).toBeVisible();
            await expect(sharedPage.getByRole('button', {name: 'Resend'})).toBeVisible();
        });
    });
});
