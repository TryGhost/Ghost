import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';
import type {Page} from '@playwright/test';

/**
 * Types a slash command into the Koenig editor and waits for the slash menu
 * to appear before continuing. This prevents race conditions where
 * pressing Enter before the menu renders can insert a newline instead of
 * selecting the menu item.
 */
async function openSlashMenu(page: Page, command: string) {
    await page.keyboard.type(`/${command}`, {delay: 50});
    await expect(page.locator('[data-kg-slash-menu]')).toBeVisible({timeout: 5000});
}

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

const configWithTenorEnabled = {
    ...responseFixtures.config,
    config: {
        ...responseFixtures.config.config,
        tenor: {
            googleApiKey: 'test-tenor-key',
            contentFilter: 'off'
        }
    }
};

const managedEmailConfigWithoutSendingDomain = {
    ...responseFixtures.config,
    config: {
        ...responseFixtures.config.config,
        hostSettings: {
            ...responseFixtures.config.config.hostSettings,
            managedEmail: {
                enabled: true
            }
        }
    }
};

const automatedEmailDesignFixture = {
    automated_email_design: [{
        id: 'default-automated-email-design',
        slug: 'default-automated-email',
        background_color: 'light',
        header_background_color: 'transparent',
        header_image: null,
        show_header_icon: true,
        show_header_title: true,
        footer_content: null,
        button_color: null,
        button_corners: 'square',
        button_style: 'fill',
        link_color: null,
        link_style: 'accent',
        body_font_category: 'sans_serif',
        title_font_category: 'sans_serif',
        title_font_weight: 'bold',
        image_corners: 'square',
        divider_color: null,
        section_title_color: null,
        show_badge: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: null
    }]
};

const settingsWithPublicationIcon = updatedSettingsResponse([
    {key: 'icon', value: 'https://example.com/content/images/icon.png'}
]);

const pasteText = async (page: Page, content: string) => {
    await page.evaluate((text: string) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', text);

        document.activeElement?.dispatchEvent(new ClipboardEvent('paste', {
            clipboardData: dataTransfer,
            bubbles: true,
            cancelable: true
        }));

        dataTransfer.clearData();
    }, content);
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

        test('welcome email editor pastes URL and fetches embed metadata', async ({page}) => {
            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture},
                fetchOembed: {
                    method: 'GET',
                    path: /^\/oembed\/\?/,
                    response: {
                        type: 'video',
                        html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/8YWl7tDGUPA?feature=oembed" frameborder="0" allowfullscreen></iframe>'
                    }
                }
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByTestId('free-welcome-email-preview').click();

            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();

            const editor = modal.locator('[data-kg="editor"] div[contenteditable="true"]').first();
            await editor.click({timeout: 5000});
            await page.keyboard.press('ControlOrMeta+a');
            await page.keyboard.press('Backspace');

            await pasteText(page, 'https://ghost.org/');

            await expect(modal.getByTestId('embed-iframe')).toBeVisible();

            await expect.poll(() => lastApiRequests.fetchOembed?.url || '').toContain('/oembed/?');
            await expect.poll(() => lastApiRequests.fetchOembed?.url || '').toContain('url=https%3A%2F%2Fghost.org%2F');
        });

        test('welcome email editor bookmark card fetches bookmark metadata', async ({page}) => {
            const {lastApiRequests} = await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture},
                fetchOembed: {
                    method: 'GET',
                    path: /^\/oembed\/\?/,
                    response: {
                        url: 'https://ghost.org/',
                        metadata: {
                            icon: 'https://ghost.org/favicon.ico',
                            title: 'Ghost: The Creator Economy Platform',
                            description: 'Build independent publishing businesses and memberships.',
                            publisher: 'Ghost.org',
                            author: 'Ghost',
                            thumbnail: 'https://ghost.org/images/meta/ghost.png'
                        }
                    }
                }
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByTestId('free-welcome-email-preview').click();

            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();

            const editor = modal.locator('[data-kg="editor"] div[contenteditable="true"]').first();
            await editor.click({timeout: 5000});
            await page.keyboard.press('ControlOrMeta+a');
            await page.keyboard.press('Backspace');
            await openSlashMenu(page, 'bookmark');
            await page.keyboard.press('Enter');

            const bookmarkUrlInput = modal.getByTestId('bookmark-url');
            await expect(bookmarkUrlInput).toBeVisible({timeout: 10000});
            await bookmarkUrlInput.fill('https://ghost.org/');
            await bookmarkUrlInput.press('Enter');

            await expect(modal.getByTestId('bookmark-title')).toContainText('Ghost: The Creator Economy Platform');
            await expect.poll(() => lastApiRequests.fetchOembed?.url || '').toContain('type=bookmark');
        });

        test('welcome email editor inserts call to action card via slash menu', async ({page}) => {
            await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByTestId('free-welcome-email-preview').click();

            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();

            const editor = modal.locator('[data-kg="editor"] div[contenteditable="true"]').first();
            await editor.click({timeout: 5000});
            await page.keyboard.press('ControlOrMeta+a');
            await page.keyboard.press('Backspace');
            await openSlashMenu(page, 'call-to-action');
            await page.keyboard.press('Enter');

            await expect(modal.locator('[data-kg-card="call-to-action"]')).toBeVisible();
        });

        test('welcome email editor inserts product card via slash menu', async ({page}) => {
            await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByTestId('free-welcome-email-preview').click();

            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();

            const editor = modal.locator('[data-kg="editor"] div[contenteditable="true"]').first();
            await editor.click({timeout: 5000});
            await page.keyboard.press('ControlOrMeta+a');
            await page.keyboard.press('Backspace');
            await openSlashMenu(page, 'product');
            await page.keyboard.press('Enter');

            await expect(modal.locator('[data-kg-card="product"]')).toBeVisible();
        });

        test('welcome email editor does not show GIF selector when Tenor is not configured', async ({page}) => {
            await page.route('https://tenor.googleapis.com/**', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({
                        next: null,
                        results: []
                    }),
                    headers: {
                        'content-type': 'application/json'
                    }
                });
            });

            await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByTestId('free-welcome-email-preview').click();

            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();

            const editor = modal.locator('[data-kg="editor"] div[contenteditable="true"]').first();
            await editor.click({timeout: 5000});
            await expect(editor).toBeFocused();
            await editor.press('ControlOrMeta+a');
            await editor.press('Backspace');
            await page.keyboard.type('/', {delay: 50});
            const slashMenu = page.locator('[data-kg-slash-menu]');
            await expect(slashMenu).toBeVisible({timeout: 5000});
            await expect(slashMenu.getByText('Image', {exact: true})).toBeVisible();
            await expect(slashMenu.getByText('GIF', {exact: true})).not.toBeVisible();
        });

        test('welcome email editor shows GIF selector when Tenor is configured', async ({page}) => {
            await page.route('https://tenor.googleapis.com/**', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({
                        next: null,
                        results: []
                    }),
                    headers: {
                        'content-type': 'application/json'
                    }
                });
            });

            await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: configWithTenorEnabled},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByTestId('free-welcome-email-preview').click();

            const modal = page.getByTestId('welcome-email-modal');
            await expect(modal).toBeVisible();

            const editor = modal.locator('[data-kg="editor"] div[contenteditable="true"]').first();
            await editor.click({timeout: 5000});
            await expect(editor).toBeFocused();
            await editor.press('ControlOrMeta+a');
            await editor.press('Backspace');
            await openSlashMenu(page, 'gif');
            await expect(page.locator('[data-kg-slash-menu]').getByText('GIF', {exact: true})).toBeVisible();
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

        test('preview card title stays stable when automated sender name is empty', async ({page}) => {
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

            const cardTitle = section.getByTestId('free-welcome-email-title');
            await expect(cardTitle).toHaveText('Free members welcome email');
        });
    });

    test.describe('Welcome email customize modal sender fields', async () => {
        test('shows publication icon toggle, updates preview, and saves show_header_icon when an icon exists', async ({page}) => {
            const addPaidResponse = {
                automated_emails: [{
                    id: 'paid-welcome-email-id',
                    status: 'inactive',
                    name: 'Welcome Email (Paid)',
                    slug: 'member-welcome-email-paid',
                    subject: 'Welcome to your paid subscription',
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
                browseSettings: {...globalDataRequests.browseSettings, response: settingsWithPublicationIcon},
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture},
                readAutomatedEmailDesign: {method: 'GET', path: '/automated_emails/design/', response: automatedEmailDesignFixture},
                editAutomatedEmailDesign: {method: 'PUT', path: '/automated_emails/design/', response: automatedEmailDesignFixture},
                addAutomatedEmail: {method: 'POST', path: '/automated_emails/', response: addPaidResponse},
                editAutomatedEmailSenders: {
                    method: 'PUT',
                    path: /^\/automated_emails\/senders\/?$/,
                    response: {automated_emails: automatedEmailsFixture.automated_emails}
                }
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByRole('button', {name: 'Customize'}).click();

            const modal = page.getByTestId('welcome-email-customize-modal');
            await expect(modal).toBeVisible();

            const publicationIconSwitch = modal.getByText('Publication icon').locator('..').getByRole('switch');
            await expect(publicationIconSwitch).toBeVisible();
            await expect(modal.locator('img[alt="Test Site"]').first()).toBeVisible();

            await publicationIconSwitch.click();

            await expect(modal.locator('img[alt="Test Site"]')).toHaveCount(0);

            await modal.getByRole('button', {name: 'Save'}).click();

            await expect.poll(() => lastApiRequests.editAutomatedEmailDesign?.body).toMatchObject({
                automated_email_design: [{
                    show_header_icon: false
                }]
            });
        });

        test('hides publication icon toggle when no publication icon is set', async ({page}) => {
            await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture},
                readAutomatedEmailDesign: {method: 'GET', path: '/automated_emails/design/', response: automatedEmailDesignFixture}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByRole('button', {name: 'Customize'}).click();

            const modal = page.getByTestId('welcome-email-customize-modal');
            await expect(modal).toBeVisible();

            await expect(modal.getByText('Publication icon')).toHaveCount(0);
            await expect(modal.locator('img[alt="Test Site"]')).toHaveCount(0);
        });

        test('uses placeholders when no automated sender overrides exist', async ({page}) => {
            await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture},
                readAutomatedEmailDesign: {method: 'GET', path: '/automated_emails/design/', response: automatedEmailDesignFixture}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByRole('button', {name: 'Customize'}).click();

            const modal = page.getByTestId('welcome-email-customize-modal');
            await expect(modal).toBeVisible();

            const senderNameInput = modal.getByLabel('Sender name');
            const senderEmailInput = modal.getByLabel('Sender email');
            const replyToInput = modal.getByLabel('Reply-to email');

            await expect(senderNameInput).toHaveValue('');
            await expect(senderEmailInput).toHaveValue('');
            await expect(replyToInput).toHaveValue('');

            await expect(senderNameInput).toHaveAttribute('placeholder', 'Sender');
            await expect(senderEmailInput).toHaveAttribute('placeholder', 'default@example.com');
            await expect(replyToInput).toHaveAttribute('placeholder', 'support@example.com');
        });

        test('uses sender email placeholder when newsletter reply-to is newsletter', async ({page}) => {
            const newsletterReplyToNewsletterResponse = {
                newsletters: [{
                    ...responseFixtures.newsletters.newsletters[0],
                    sender_email: 'test@example.com',
                    sender_reply_to: 'newsletter'
                }],
                meta: responseFixtures.newsletters.meta
            };

            await mockApi({page, requests: {
                ...globalDataRequests,
                browseNewslettersLimit: {method: 'GET', path: '/newsletters/?filter=status%3Aactive&limit=1', response: newsletterReplyToNewsletterResponse},
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture},
                readAutomatedEmailDesign: {method: 'GET', path: '/automated_emails/design/', response: automatedEmailDesignFixture}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByRole('button', {name: 'Customize'}).click();

            const modal = page.getByTestId('welcome-email-customize-modal');
            await expect(modal).toBeVisible();

            const senderEmailInput = modal.getByLabel('Sender email');
            const replyToInput = modal.getByLabel('Reply-to email');

            await expect(senderEmailInput).toHaveAttribute('placeholder', 'test@example.com');
            await expect(replyToInput).toHaveAttribute('placeholder', 'test@example.com');
            await expect(modal.getByText(/Reply-to:\s*test@example\.com/)).toBeVisible();
        });

        test('uses explicit newsletter reply-to as placeholder when set', async ({page}) => {
            const newsletterCustomReplyToResponse = {
                newsletters: [{
                    ...responseFixtures.newsletters.newsletters[0],
                    sender_email: 'test@example.com',
                    sender_reply_to: 'custom-reply@example.com'
                }],
                meta: responseFixtures.newsletters.meta
            };

            await mockApi({page, requests: {
                ...globalDataRequests,
                browseNewslettersLimit: {method: 'GET', path: '/newsletters/?filter=status%3Aactive&limit=1', response: newsletterCustomReplyToResponse},
                browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture},
                readAutomatedEmailDesign: {method: 'GET', path: '/automated_emails/design/', response: automatedEmailDesignFixture}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByRole('button', {name: 'Customize'}).click();

            const modal = page.getByTestId('welcome-email-customize-modal');
            await expect(modal).toBeVisible();

            const replyToInput = modal.getByLabel('Reply-to email');
            await expect(replyToInput).toHaveAttribute('placeholder', 'custom-reply@example.com');
            await expect(modal.getByText(/Reply-to:\s*custom-reply@example\.com/)).toBeVisible();
        });

        test('hides sender email field when managed email has no sending domain', async ({page}) => {
            await mockApi({page, requests: {
                ...globalDataRequests,
                ...newslettersRequest,
                browseConfig: {method: 'GET', path: '/config/', response: managedEmailConfigWithoutSendingDomain},
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture},
                readAutomatedEmailDesign: {method: 'GET', path: '/automated_emails/design/', response: automatedEmailDesignFixture}
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByRole('button', {name: 'Customize'}).click();

            const modal = page.getByTestId('welcome-email-customize-modal');
            await expect(modal).toBeVisible();
            await expect(modal.getByLabel('Sender email')).toHaveCount(0);
        });

        test('saves shared sender settings and creates missing welcome-email rows', async ({page}) => {
            const addPaidResponse = {
                automated_emails: [{
                    id: 'paid-welcome-email-id',
                    status: 'inactive',
                    name: 'Welcome Email (Paid)',
                    slug: 'member-welcome-email-paid',
                    subject: 'Welcome to your paid subscription',
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
                browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture},
                readAutomatedEmailDesign: {method: 'GET', path: '/automated_emails/design/', response: automatedEmailDesignFixture},
                editAutomatedEmailDesign: {method: 'PUT', path: '/automated_emails/design/', response: automatedEmailDesignFixture},
                addAutomatedEmail: {method: 'POST', path: '/automated_emails/', response: addPaidResponse},
                editAutomatedEmailSenders: {
                    method: 'PUT',
                    path: /^\/automated_emails\/senders\/?$/,
                    response: {
                        automated_emails: [
                            {
                                ...automatedEmailsFixture.automated_emails[0],
                                sender_name: 'Shared sender',
                                sender_email: 'shared@example.com',
                                sender_reply_to: 'shared-reply@example.com'
                            },
                            {
                                ...addPaidResponse.automated_emails[0],
                                sender_name: 'Shared sender',
                                sender_email: 'shared@example.com',
                                sender_reply_to: 'shared-reply@example.com'
                            }
                        ]
                    }
                }
            }});

            await page.goto('/#/memberemails');
            await page.waitForLoadState('networkidle');

            const section = page.getByTestId('memberemails');
            await expect(section).toBeVisible({timeout: 10000});
            await section.getByRole('button', {name: 'Customize'}).click();

            const modal = page.getByTestId('welcome-email-customize-modal');
            await expect(modal).toBeVisible();

            await modal.getByLabel('Sender name').fill('Shared sender');
            await modal.getByLabel('Sender email').fill('shared@example.com');
            await modal.getByLabel('Reply-to email').fill('shared-reply@example.com');
            await modal.getByRole('button', {name: 'Save'}).click();

            await expect.poll(() => lastApiRequests.addAutomatedEmail?.body).toMatchObject({
                automated_emails: [{
                    slug: 'member-welcome-email-paid',
                    status: 'inactive'
                }]
            });
            await expect.poll(() => lastApiRequests.editAutomatedEmailSenders?.body).toEqual({
                sender_name: 'Shared sender',
                sender_email: 'shared@example.com',
                sender_reply_to: 'shared-reply@example.com'
            });
        });
    });

    test('shows verification confirmation for memberemails verifyEmail token', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...newslettersRequest,
            browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
            browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: automatedEmailsFixture},
            verifyAutomatedEmailSenders: {
                method: 'PUT',
                path: /^\/automated_emails\/verifications\/?$/,
                response: {
                    automated_emails: automatedEmailsFixture.automated_emails,
                    meta: {
                        email_verified: 'sender_reply_to'
                    }
                }
            }
        }});

        await page.goto('/#/memberemails?verifyEmail=test-verification-token');
        await page.waitForLoadState('networkidle');

        const confirmation = page.getByTestId('confirmation-modal');
        await expect(confirmation).toBeVisible();
        await expect(confirmation).toContainText('Reply-to address verified');
        await expect(page).toHaveURL(/#\/memberemails$/);
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
