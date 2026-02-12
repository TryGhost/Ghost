const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const security = require('@tryghost/security');
const models = require('../../../core/server/models');
const DataGenerator = require('../../utils/fixtures/data-generator');
const {signInAsUserById, signOutCurrentUser} = require('../utils/e2e-browser-utils');

test.describe('Portal', () => {
    test.describe('Invites', () => {
        test('New staff member can signup using an invite link', async ({sharedPage}) => {
            // Navigate to settings
            await sharedPage.goto('/ghost');
            await sharedPage.locator('[data-sidebar="sidebar"]').getByRole('link', {name: 'Settings'}).click();
            await sharedPage.waitForLoadState('networkidle');

            const testEmail = `test-${Date.now()}@gmail.com`;

            // Send the invitation
            await sharedPage.getByRole('button', {name: 'Invite people'}).click();
            await sharedPage.getByPlaceholder('jamie@example.com').fill(testEmail);

            // Set up response listener just before clicking send
            const responsePromise = sharedPage.waitForResponse(
                response => response.url().includes('/api/admin/invites/') &&
                           response.request().method() === 'POST'
            );

            // Click send invitation
            await sharedPage.getByRole('button', {name: 'Send invitation'}).click();

            // Wait for the API response
            const response = await responsePromise;
            await response.json();

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

            await signOutCurrentUser(sharedPage);

            // Open invite URL
            await sharedPage.goto(inviteUrl);

            // Verify we're on the signup page
            await sharedPage.waitForLoadState('networkidle');
            await expect(sharedPage.locator('text=Create your account.')).toBeVisible();

            //Signup using the invite Link
            await sharedPage.getByPlaceholder('Jamie Larson').fill('Test User');
            await sharedPage.getByPlaceholder('jamie@example.com').fill(testEmail);
            await sharedPage.getByPlaceholder('At least 10 characters').fill('test123456');
            await sharedPage.getByRole('button', {name: 'Create Account →'}).click();
            await expect(sharedPage).toHaveURL(/\/ghost\/#\/.*/, {timeout: 30000});

            // Invited users are Contributors, which get a floating user menu instead of the sidebar
            await sharedPage.getByRole('button', {name: 'Open user menu'}).click();
            await expect(sharedPage.locator(`text=${testEmail}`)).toBeVisible();

            await signOutCurrentUser(sharedPage);

            await signInAsUserById(sharedPage, DataGenerator.Content.users[0].id);
        });

        test.describe('2FA invite test', () => {
            test('New staff member can signup using an invite link with 2FA enabled', async ({sharedPage}) => {
                // Navigate to settings
                await sharedPage.goto('/ghost');
                await sharedPage.locator('[data-sidebar="sidebar"]').getByRole('link', {name: 'Settings'}).click();
                await sharedPage.waitForLoadState('networkidle');

                const testEmail = `test-${Date.now()}@gmail.com`;

                // Send the invitation
                await sharedPage.getByRole('button', {name: 'Invite people'}).click();
                await sharedPage.getByPlaceholder('jamie@example.com').fill(testEmail);

                // Set up response listener just before clicking send
                const responsePromise = sharedPage.waitForResponse(
                    response => response.url().includes('/api/admin/invites/') &&
                               response.request().method() === 'POST'
                );

                // Click send invitation
                await sharedPage.getByRole('button', {name: 'Send invitation'}).click();

                // Wait for the API response
                const response = await responsePromise;
                await response.json();

                // Verify the invitation was sent (UI feedback)
                const invitedMessage = sharedPage.getByText('Invitation sent', {exact: true});
                await expect(invitedMessage).toBeVisible({timeout: 5000});

                // Get the token from database
                const invite = await models.Invite.findOne({email: testEmail});
                const token = invite.get('token');

                // Construct the invite URL
                const encodedToken = security.url.encodeBase64(token);
                const adminUrl = new URL(sharedPage.url()).origin + '/ghost';
                const inviteUrl = `${adminUrl}/signup/${encodedToken}/`;
                const context = await sharedPage.context();
                await context.clearCookies();

                await signOutCurrentUser(sharedPage);

                // Open invite URL
                await sharedPage.goto(inviteUrl);

                // Verify we're on the signup page
                await sharedPage.waitForLoadState('networkidle');
                await expect(sharedPage.locator('text=Create your account.')).toBeVisible();

                //Signup using the invite Link
                await sharedPage.getByPlaceholder('Jamie Larson').fill('Test User');
                await sharedPage.getByPlaceholder('jamie@example.com').fill(testEmail);
                await sharedPage.getByPlaceholder('At least 10 characters').fill('test123456');
                await sharedPage.getByRole('button', {name: 'Create Account →'}).click();
                await expect(sharedPage).toHaveURL(/\/ghost\/#\/.*/, {timeout: 30000});
                // Reload so the React admin picks up the newly authenticated session
                await sharedPage.goto('/ghost');

                // Invited users are Contributors, which get a floating user menu instead of the sidebar
                await sharedPage.getByRole('button', {name: 'Open user menu'}).click({timeout: 30000});
                await expect(sharedPage.locator(`text=${testEmail}`)).toBeVisible();

                await signOutCurrentUser(sharedPage);

                await signInAsUserById(sharedPage, DataGenerator.Content.users[0].id);
            });
        });
    });
});
