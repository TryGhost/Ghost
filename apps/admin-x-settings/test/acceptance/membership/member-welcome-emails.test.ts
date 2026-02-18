import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

const automatedEmailsFixture = {
    automated_emails: [{
        id: 'free-welcome-email-id',
        status: 'active',
        name: 'Welcome Email (Free)',
        slug: 'member-welcome-email-free',
        subject: 'Welcome to Test Site',
        // Note the lexical content includes a template token ({name})
        lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome {name} to our site!","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
        sender_name: null,
        sender_email: null,
        sender_reply_to: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: null
    }]
};

const newslettersRequest = {
    browseNewslettersLimit: {method: 'GET', path: '/newsletters/?filter=status%3Aactive&limit=1', response: responseFixtures.newsletters}
};

test.describe('Member emails settings', async () => {
    test.describe('Welcome email modal', async () => {
        test('Escape key closes test email dropdown without closing modal', async ({page}) => {
            await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture}
            }});

            // Navigate directly to the memberemails section
            await page.goto('/#/memberemails');

            // Wait for page to load
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Click the Edit button on the welcome email preview to open the modal
            await section.getByTestId('free-welcome-email-preview').click();

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
            await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture}
            }});

            // Navigate directly to the memberemails section
            await page.goto('/#/memberemails');

            // Wait for page to load
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Click the Edit button on the welcome email preview to open the modal
            await section.getByTestId('free-welcome-email-preview').click();

            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();

            // Press Escape without opening the dropdown - should close the modal
            await page.keyboard.press('Escape');

            // Verify modal is closed
            await expect(modal).not.toBeVisible();
        });

        test('Welcome email modal does not start dirty but becomes dirty after edit', async ({page}) => {
            await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture}
            }});

            // Navigate directly to the memberemails section
            await page.goto('/#/memberemails');

            // Wait for page to load
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Open modal
            await section.getByTestId('free-welcome-email-preview').click();
            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();

            // Close without edits - should not trigger unsaved confirmation
            await page.keyboard.press('Escape');
            await expect(modal).not.toBeVisible();
            await expect(page.getByTestId('confirmation-modal')).not.toBeVisible();

            // Re-open modal
            await section.getByTestId('free-welcome-email-preview').click();
            await expect(modal).toBeVisible();

            // Edit subject to mark dirty
            const subjectInput = modal.locator('input').first();
            await expect(subjectInput).toHaveValue('Welcome to Test Site');
            await subjectInput.fill('Updated subject');
            await expect(subjectInput).toHaveValue('Updated subject');

            // Close with unsaved changes - should show confirmation modal
            // First Escape blurs the input, second triggers modal close
            await page.keyboard.press('Escape');
            await page.keyboard.press('Escape');
            const confirmationModal = page.getByTestId('confirmation-modal');
            await expect(confirmationModal).toBeVisible();
            await confirmationModal.getByRole('button', {name: 'Stay'}).click();
            await expect(confirmationModal).not.toBeVisible();
            await expect(modal).toBeVisible();
        });

        test('Escape key does not close modal or navigate away when pressed from Koenig link input', async ({page}) => {
            await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture}
            }});

            // Navigate directly to the memberemails section
            await page.goto('/#/memberemails');

            // Wait for page to load
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Click the Edit button on the welcome email preview to open the modal
            await section.getByTestId('free-welcome-email-preview').click();

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

        test('uses automated email sender fields when populated, even if newsletter differs', async ({page}) => {
            const populatedAutomatedEmailsFixture = {
                automated_emails: [{
                    ...automatedEmailsFixture.automated_emails[0],
                    sender_name: 'Automated Sender',
                    sender_email: 'automated@example.com',
                    sender_reply_to: 'reply-automated@example.com'
                }]
            };

            const defaultNewsletterResponse = {
                newsletters: [{
                    ...responseFixtures.newsletters.newsletters[0],
                    sender_name: 'Newsletter Sender',
                    sender_email: 'newsletter@example.com',
                    sender_reply_to: 'support'
                }],
                meta: responseFixtures.newsletters.meta
            };

            await mockApi({page, requests: {
                ...globalDataRequests,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: populatedAutomatedEmailsFixture},
                browseNewslettersLimit: {method: 'GET', path: '/newsletters/?filter=status%3Aactive&limit=1', response: defaultNewsletterResponse}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByTestId('free-welcome-email-preview').click();

            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();
            await expect(modal).toContainText('Automated Sender');
            await expect(modal).toContainText('automated@example.com');
            await expect(modal).toContainText('reply-automated@example.com');
            await expect(modal).not.toContainText('newsletter@example.com');
        });

        test('falls back to default newsletter sender values when automated fields are empty', async ({page}) => {
            const emptyAutomatedSenderFixture = {
                automated_emails: [{
                    ...automatedEmailsFixture.automated_emails[0],
                    sender_name: '   ',
                    sender_email: '   ',
                    sender_reply_to: '   '
                }]
            };

            const defaultNewsletterResponse = {
                newsletters: [{
                    ...responseFixtures.newsletters.newsletters[0],
                    sender_name: 'Newsletter Sender',
                    sender_email: 'newsletter@example.com',
                    sender_reply_to: 'support'
                }],
                meta: responseFixtures.newsletters.meta
            };

            await mockApi({page, requests: {
                ...globalDataRequests,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: emptyAutomatedSenderFixture},
                browseNewslettersLimit: {method: 'GET', path: '/newsletters/?filter=status%3Aactive&limit=1', response: defaultNewsletterResponse}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByTestId('free-welcome-email-preview').click();

            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();
            await expect(modal).toContainText('Newsletter Sender');
            await expect(modal).toContainText('newsletter@example.com');
            await expect(modal).toContainText('support@example.com');
            await expect(modal).not.toContainText('default@example.com');
        });

        test('preview card uses newsletter sender name when automated sender name is empty', async ({page}) => {
            const emptyAutomatedSenderFixture = {
                automated_emails: [{
                    ...automatedEmailsFixture.automated_emails[0],
                    sender_name: '   '
                }]
            };

            const defaultNewsletterResponse = {
                newsletters: [{
                    ...responseFixtures.newsletters.newsletters[0],
                    sender_name: 'Newsletter Sender'
                }],
                meta: responseFixtures.newsletters.meta
            };

            await mockApi({page, requests: {
                ...globalDataRequests,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: emptyAutomatedSenderFixture},
                browseNewslettersLimit: {method: 'GET', path: '/newsletters/?filter=status%3Aactive&limit=1', response: defaultNewsletterResponse}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            const cardSenderName = section.locator('[data-testid="free-welcome-email-preview"] .font-semibold').first();
            await expect(cardSenderName).toHaveText('Newsletter Sender');
        });
    });

    // NY-842: Tests for editing/viewing welcome emails before activation
    test.describe('Email preview visibility and edit-before-activation', async () => {
        test('Email preview card is visible with default subject when no DB row exists', async ({page}) => {
            // Empty automated_emails response - no DB rows exist
            const emptyAutomatedEmailsFixture = {
                automated_emails: []
            };

            await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: emptyAutomatedEmailsFixture}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Email preview card should be visible even though no DB row exists
            const emailPreview = section.getByTestId('free-welcome-email-preview');
            await expect(emailPreview).toBeVisible();

            // Should show default subject based on site title from settings
            await expect(emailPreview).toContainText('Welcome to');

            // Edit button should be visible and enabled
            const editButton = section.getByTestId('free-welcome-email-preview');
            await expect(editButton).toBeVisible();
            await expect(editButton).toBeEnabled();
        });

        test('Clicking Edit when no row exists creates inactive row then opens modal', async ({page}) => {
            const emptyAutomatedEmailsFixture = {
                automated_emails: []
            };

            // Response after creating the automated email
            const createdAutomatedEmailResponse = {
                automated_emails: [{
                    id: 'new-free-welcome-email-id',
                    status: 'inactive',
                    name: 'Welcome Email (Free)',
                    slug: 'member-welcome-email-free',
                    subject: 'Welcome to Test Site',
                    lexical: '{"root":{"children":[]}}',
                    sender_name: null,
                    sender_email: null,
                    sender_reply_to: null,
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: null
                }]
            };

            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: emptyAutomatedEmailsFixture},
                addAutomatedEmail: {method: 'POST', path: '/automated_emails/', response: createdAutomatedEmailResponse}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Click Edit button when no row exists
            const editButton = section.getByTestId('free-welcome-email-preview');
            await editButton.click();

            // Verify API was called to create an INACTIVE row
            expect(lastApiRequests.addAutomatedEmail?.body).toMatchObject({
                automated_emails: [{
                    status: 'inactive',
                    slug: 'member-welcome-email-free'
                }]
            });

            // Modal should open
            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();
        });

        test('Clicking Edit when row exists does NOT create new row, just opens modal', async ({page}) => {
            const existingAutomatedEmailsFixture = {
                automated_emails: [{
                    id: 'free-welcome-email-id',
                    status: 'inactive',
                    name: 'Welcome Email (Free)',
                    slug: 'member-welcome-email-free',
                    subject: 'Welcome to Test Site',
                    lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Welcome!","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
                    sender_name: null,
                    sender_email: null,
                    sender_reply_to: null,
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: null
                }]
            };

            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: existingAutomatedEmailsFixture},
                addAutomatedEmail: {method: 'POST', path: '/automated_emails/', response: existingAutomatedEmailsFixture}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Click Edit button when row already exists
            const editButton = section.getByTestId('free-welcome-email-preview');
            await editButton.click();

            // Verify NO POST API was called (no new row created)
            expect(lastApiRequests.addAutomatedEmail).toBeUndefined();

            // Modal should open
            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();
        });

        test('Toggle ON when no row exists creates active row', async ({page}) => {
            const emptyAutomatedEmailsFixture = {
                automated_emails: []
            };

            const createdActiveResponse = {
                automated_emails: [{
                    id: 'new-free-welcome-email-id',
                    status: 'active',
                    name: 'Welcome Email (Free)',
                    slug: 'member-welcome-email-free',
                    subject: 'Welcome to Test Site',
                    lexical: '{"root":{"children":[]}}',
                    sender_name: null,
                    sender_email: null,
                    sender_reply_to: null,
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: null
                }]
            };

            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: emptyAutomatedEmailsFixture},
                addAutomatedEmail: {method: 'POST', path: '/automated_emails/', response: createdActiveResponse}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Toggle ON when no row exists
            const toggle = section.getByRole('switch').first();
            await toggle.click();

            // Verify API was called to create an ACTIVE row
            expect(lastApiRequests.addAutomatedEmail?.body).toMatchObject({
                automated_emails: [{
                    status: 'active',
                    slug: 'member-welcome-email-free'
                }]
            });
        });

        test('Toggle ON when inactive row exists updates to active', async ({page}) => {
            const inactiveAutomatedEmailsFixture = {
                automated_emails: [{
                    id: 'free-welcome-email-id',
                    status: 'inactive',
                    name: 'Welcome Email (Free)',
                    slug: 'member-welcome-email-free',
                    subject: 'Welcome to Test Site',
                    lexical: '{"root":{"children":[]}}',
                    sender_name: null,
                    sender_email: null,
                    sender_reply_to: null,
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: null
                }]
            };

            const updatedActiveResponse = {
                automated_emails: [{
                    ...inactiveAutomatedEmailsFixture.automated_emails[0],
                    status: 'active'
                }]
            };

            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: inactiveAutomatedEmailsFixture},
                editAutomatedEmail: {method: 'PUT', path: '/automated_emails/free-welcome-email-id/', response: updatedActiveResponse}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Toggle ON when inactive row exists
            const toggle = section.getByRole('switch').first();
            await toggle.click();

            // Verify API was called to UPDATE to active status
            expect(lastApiRequests.editAutomatedEmail?.body).toMatchObject({
                automated_emails: [{
                    id: 'free-welcome-email-id',
                    status: 'active'
                }]
            });
        });

        test('Toggle OFF when active row exists updates to inactive', async ({page}) => {
            const activeAutomatedEmailsFixture = {
                automated_emails: [{
                    id: 'free-welcome-email-id',
                    status: 'active',
                    name: 'Welcome Email (Free)',
                    slug: 'member-welcome-email-free',
                    subject: 'Welcome to Test Site',
                    lexical: '{"root":{"children":[]}}',
                    sender_name: null,
                    sender_email: null,
                    sender_reply_to: null,
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: null
                }]
            };

            const updatedInactiveResponse = {
                automated_emails: [{
                    ...activeAutomatedEmailsFixture.automated_emails[0],
                    status: 'inactive'
                }]
            };

            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: activeAutomatedEmailsFixture},
                editAutomatedEmail: {method: 'PUT', path: '/automated_emails/free-welcome-email-id/', response: updatedInactiveResponse}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});

            // Toggle OFF when active row exists
            const toggle = section.getByRole('switch').first();
            await toggle.click();

            // Verify API was called to UPDATE to inactive status
            expect(lastApiRequests.editAutomatedEmail?.body).toMatchObject({
                automated_emails: [{
                    id: 'free-welcome-email-id',
                    status: 'inactive'
                }]
            });
        });
    });
});
