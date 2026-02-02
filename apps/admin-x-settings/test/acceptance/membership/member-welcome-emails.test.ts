import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

const automatedEmailsFixture = {
    automated_emails: [{
        id: 'free-welcome-email-id',
        status: 'active',
        name: 'Welcome Email (Free)',
        slug: 'member-welcome-email-free',
        subject: 'Welcome to Test Site',
        lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome to our site!","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
        sender_name: null,
        sender_email: null,
        sender_reply_to: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: null
    }]
};

test.describe('Member emails settings', async () => {
    test.describe('Welcome email modal', async () => {
        test('Escape key closes test email dropdown without closing modal', async ({page}) => {
            // Config with welcomeEmails feature flag enabled
            const configResponse = {
                config: {
                    ...responseFixtures.config.config,
                    labs: {
                        welcomeEmails: true
                    }
                }
            };

            await mockApi({page, requests: {
                ...globalDataRequests,
                browseConfig: {method: 'GET', path: '/config/', response: configResponse},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture}
            }});

            // Navigate directly to the memberemails section
            await page.goto('/#/memberemails');

            // Wait for page to load
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Click the Edit button on the welcome email preview to open the modal
            await section.getByTestId('free-welcome-email-edit-button').click();

            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();

            // Click the Test button to open the dropdown
            await modal.getByRole('button', {name: 'Test'}).click();

            // Verify the dropdown is visible
            const dropdown = page.getByTestId('test-email-dropdown');
            await expect(dropdown).toBeVisible();

            // Press Escape - should close dropdown but NOT the modal
            await page.keyboard.press('Escape');

            // Verify dropdown is closed
            await expect(dropdown).not.toBeVisible();

            // Verify modal is still open
            await expect(modal).toBeVisible();
        });

        test('Escape key closes modal when test email dropdown is not open', async ({page}) => {
            // Config with welcomeEmails feature flag enabled
            const configResponse = {
                config: {
                    ...responseFixtures.config.config,
                    labs: {
                        welcomeEmails: true
                    }
                }
            };

            await mockApi({page, requests: {
                ...globalDataRequests,
                browseConfig: {method: 'GET', path: '/config/', response: configResponse},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture}
            }});

            // Navigate directly to the memberemails section
            await page.goto('/#/memberemails');

            // Wait for page to load
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Click the Edit button on the welcome email preview to open the modal
            await section.getByTestId('free-welcome-email-edit-button').click();

            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();

            // Press Escape without opening the dropdown - should close the modal
            await page.keyboard.press('Escape');

            // Verify modal is closed
            await expect(modal).not.toBeVisible();
        });

        test('Escape key does not close modal or navigate away when pressed from Koenig link input', async ({page}) => {
            // Config with welcomeEmails feature flag enabled
            const configResponse = {
                config: {
                    ...responseFixtures.config.config,
                    labs: {
                        welcomeEmails: true
                    }
                }
            };

            await mockApi({page, requests: {
                ...globalDataRequests,
                browseConfig: {method: 'GET', path: '/config/', response: configResponse},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture}
            }});

            // Navigate directly to the memberemails section
            await page.goto('/#/memberemails');

            // Wait for page to load
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Click the Edit button on the welcome email preview to open the modal
            await section.getByTestId('free-welcome-email-edit-button').click();

            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();

            // Inject a mock link input with data-kg-link-input attribute (simulating Koenig's portal-rendered input)
            // Koenig renders the link input in a portal outside the editor container
            await page.evaluate(() => {
                const mockInput = document.createElement('input');
                mockInput.setAttribute('data-kg-link-input', '');
                mockInput.setAttribute('type', 'text');
                document.body.appendChild(mockInput);
                mockInput.focus();
            });

            // Verify our mock input is focused
            const linkInput = page.locator('[data-kg-link-input]');
            await expect(linkInput).toBeFocused();

            // Press Escape - should NOT close the modal and should NOT navigate away from settings
            await page.keyboard.press('Escape');

            // Verify modal is still open
            await expect(modal).toBeVisible();

            // Verify we didn't navigate away from settings
            expect(page.url()).toContain('/#/memberemails');
            const settingsContent = page.locator('#admin-x-settings-content');
            await expect(settingsContent).toBeVisible();

            // Clean up
            await page.evaluate(() => {
                document.querySelector('[data-kg-link-input]')?.remove();
            });
        });
    });
});
