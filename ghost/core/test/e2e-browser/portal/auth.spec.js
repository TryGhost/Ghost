const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createMember} = require('../utils');

test.describe('Portal', () => {
    test.describe('Authentication', () => {
        test('can sign in via magic link', async ({sharedPage, magicLinkUrl}) => {
            // Create a new free member
            await createMember(sharedPage, {
                name: 'Test Member Signin',
                email: 'test.member.signin@example.com',
                note: 'Test Member'
            });

            // Navigate to the site homepage
            await sharedPage.goto('/');

            // Open Portal
            const portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');

            await portalTriggerButton.click();

            await portalFrame.locator('[data-test-button="signin-switch"]').click();
            await portalFrame.locator('input[name="email"]').fill('test.member.signin@example.com');
            await portalFrame.getByRole('button', {name: 'Continue'}).click();

            await expect(portalFrame.getByText('Now check your email!')).toBeVisible();
            await expect(portalFrame.getByText(/A login link has been sent/)).toBeVisible();

            await portalFrame.getByRole('button', {name: 'Close'}).click();

            const magicLink = await magicLinkUrl.getUrl();
            expect(magicLink).not.toBeNull();

            await sharedPage.goto(magicLink);

            await portalTriggerButton.click();
            await expect(portalFrame.getByText('Your account')).toBeVisible();
        });

        test('can sign in via OTC', async ({sharedPage, otcToken}) => {
            // Enable OTC lab flag
            await sharedPage.goto('/ghost');
            await sharedPage.locator('[data-test-nav="settings"]').click();

            const labsSection = sharedPage.getByTestId('labs');
            await labsSection.scrollIntoViewIfNeeded();
            await labsSection.getByRole('button', {name: 'Open'}).click();
            await labsSection.getByRole('tab', {name: 'Private features'}).click();
            await labsSection.getByRole('button', {name: 'Members sign-in OTC (alpha)'}).click();

            const otcToggle = labsSection.locator('input[type="checkbox"]').filter({hasText: /one.*time.*code|OTC/i}).first();
            if (!await otcToggle.isChecked()) {
                await otcToggle.check();
            }

            // Create a new free member
            await createMember(sharedPage, {
                name: 'Test Member OTC',
                email: 'test.member.otc@example.com',
                note: 'Test Member OTC'
            });

            // Navigate to the site homepage
            await sharedPage.goto('/');

            // Open Portal and sign in
            const portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');

            await portalTriggerButton.click();
            await portalFrame.locator('[data-test-button="signin-switch"]').click();
            await portalFrame.locator('input[name="email"]').fill('test.member.otc@example.com');
            await portalFrame.getByRole('button', {name: 'Continue'}).click();

            // Verify magic link page is shown with OTC option
            await expect(portalFrame.getByText('Now check your email!')).toBeVisible();
            await expect(portalFrame.getByText(/Click the link inside or enter your code below/)).toBeVisible();

            // Verify OTC input field is visible
            await expect(portalFrame.locator('input[name="otc"]')).toBeVisible();

            // Get the OTC from email
            const token = await otcToken.getToken();
            expect(token).not.toBeNull();

            // Submit OTC
            await portalFrame.locator('input[name="otc"]').fill(token);
            await portalFrame.getByRole('button', {name: 'Continue'}).click();

            // Verify successful sign in - Portal should show account home
            await expect(portalFrame.locator('[data-test-button="footer-signout"]')).toBeVisible({timeout: 10000});
        });
    });
});
