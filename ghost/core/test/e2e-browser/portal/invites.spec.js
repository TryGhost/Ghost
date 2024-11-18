const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const security = require('@tryghost/security');
const models = require('../../../core/server/models');

/**
 * @param {import('@playwright/test').Page} page
 */
test.describe('Portal', () => {
    test.describe('Invites', () => {
        test('Send invitation to a new staff member', async ({sharedPage}) => {
            // Navigate to settings
            await sharedPage.goto('/ghost');
            await sharedPage.locator('[data-test-nav="settings"]').click();
            await sharedPage.waitForLoadState('networkidle');

            const testEmail = 'test@gmail.com';

            // Send the invitation
            await sharedPage.getByRole('button', {name: 'Invite people'}).click();
            await sharedPage.getByPlaceholder('jamie@example.com').fill(testEmail);

            // Set up response listener just before clicking send
            let inviteResponse = null;
            const responsePromise = sharedPage.waitForResponse(
                response => response.url().includes('/api/admin/invites/') && 
                           response.request().method() === 'POST'
            );

            // Click send invitation
            await sharedPage.getByRole('button', { name: 'Send invitation' }).click();

            // Wait for the API response
            const response = await responsePromise;
            inviteResponse = await response.json();
            console.log('Invite API Response:', inviteResponse);

            // Verify the invitation was sent (UI feedback)
            const invitedMessage = sharedPage.getByText('Invitation sent', {exact: true});
            await expect(invitedMessage).toBeVisible({timeout: 5000});

            // Get the token from database
            const invite = await models.Invite.findOne({email: testEmail});
            const token = invite.get('token');

            // Construct the invite URL
            const adminUrl = new URL(sharedPage.url()).origin + '/ghost';
            const encodedToken = security.url.encodeBase64(token);
            const inviteUrl = `${adminUrl}/signup/${encodedToken}/`;
            
            console.log('Invite URL:', inviteUrl);
        });
    });
});
