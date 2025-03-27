import {chooseOptionInSelect, limitRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';
import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';

test.describe('Newsletter settings', async () => {
    test('Supports creating a new newsletter', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters},
            addNewsletter: {method: 'POST', path: '/newsletters/?opt_in_existing=true&include=count.active_members%2Ccount.posts', response: {newsletters: [{
                id: 'new-newsletter',
                name: 'New newsletter',
                description: null,
                count: {
                    active_members: 0,
                    posts: 0
                }
            }]}}
        }});

        await page.goto('/');

        const section = page.getByTestId('newsletters');

        await section.getByRole('button', {name: 'Add newsletter'}).click();

        const modal = page.getByTestId('add-newsletter-modal');
        await modal.getByRole('button', {name: 'Create'}).click();

        await expect(modal).toHaveText(/A name is required for your newsletter/);

        // Shouldn't be necessary, but without these Playwright doesn't click Create the second time for some reason
        await modal.getByRole('button', {name: 'Cancel'}).click();
        await section.getByRole('button', {name: 'Add newsletter'}).click();

        await modal.getByLabel('Name').fill('New newsletter');
        await modal.getByRole('button', {name: 'Create'}).click();

        await expect(page.getByTestId('newsletter-modal')).toHaveCount(1);

        expect(lastApiRequests.addNewsletter?.body).toMatchObject({
            newsletters: [{
                name: 'New newsletter'
            }]
        });
    });

    test('Supports updating a newsletter', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters},
            editNewsletter: {method: 'PUT', path: `/newsletters/${responseFixtures.newsletters.newsletters[0].id}/?include=count.active_members%2Ccount.posts`, response: {
                newsletters: [{
                    ...responseFixtures.newsletters.newsletters[0],
                    name: 'Updated newsletter',
                    body_font_category: 'sans_serif'
                }]
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('newsletters');

        await section.getByText('Awesome newsletter').click();

        const modal = page.getByTestId('newsletter-modal');

        await modal.getByPlaceholder('Weekly Roundup').fill('');
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).toHaveText(/A name is required for your newsletter/);

        await modal.getByPlaceholder('Weekly Roundup').fill('Updated newsletter');

        await modal.getByRole('tab', {name: 'Design'}).click();
        await chooseOptionInSelect(modal.getByTestId('body-font-select'), 'Clean sans-serif');

        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(section.getByText('Updated newsletter')).toHaveCount(1);

        expect(lastApiRequests.editNewsletter?.body).toMatchObject({
            newsletters: [{
                id: responseFixtures.newsletters.newsletters[0].id,
                name: 'Updated newsletter',
                body_font_category: 'sans_serif'
            }]
        });
    });

    test.describe('Email addresses', async () => {
        test.describe('For self-hosters', async () => {
            test('Displays a prompt when email verification is required', async ({page}) => {
                await mockApi({page, requests: {
                    ...globalDataRequests,
                    browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters},
                    editNewsletter: {method: 'PUT', path: `/newsletters/${responseFixtures.newsletters.newsletters[0].id}/?include=count.active_members%2Ccount.posts`, response: {
                        newsletters: [responseFixtures.newsletters.newsletters[0]],
                        meta: {
                            sent_email_verification: ['sender_email']
                        }
                    }}
                }});

                await page.goto('/');

                const section = page.getByTestId('newsletters');

                await section.getByText('Awesome newsletter').click();

                const modal = page.getByTestId('newsletter-modal');

                await modal.getByLabel('Sender email').fill('not-an-email');
                await modal.getByRole('button', {name: 'Save'}).click();

                await expect(modal).toHaveText(/Enter a valid email address/);

                await modal.getByLabel('Sender email').fill('test@test.com');
                await modal.getByRole('button', {name: 'Save'}).click();

                await expect(page.getByTestId('toast-info')).toHaveCount(1);
                await expect(page.getByTestId('toast-info')).toHaveText(/sent a confirmation email to the new address/);
            });
        });

        test.describe('For Ghost (Pro) users without custom domain', () => {
            test('Does not allow the Sender email address to be edited', async ({page}) => {
                await mockApi({page, requests: {
                    ...globalDataRequests,
                    browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters},
                    browseConfig: {
                        ...globalDataRequests.browseConfig,
                        response: {
                            config: {
                                ...responseFixtures.config.config,
                                hostSettings: {
                                    managedEmail: {
                                        enabled: true
                                    }
                                }
                            }
                        }
                    }
                }});

                await page.goto('/');
                const section = page.getByTestId('newsletters');
                await section.getByText('Awesome newsletter').click();
                const modal = page.getByTestId('newsletter-modal');
                const senderEmailField = modal.getByLabel('Sender email');

                // Test that there is no input field near "Sender email"
                const parentElementLocator = senderEmailField.locator('xpath=..');
                const inputElementsNearby = await parentElementLocator.locator('input').count();

                expect(inputElementsNearby).toBe(0);
            });

            test('Allow full customisation of the reply-to address', async ({page}) => {
                await mockApi({page, requests: {
                    ...globalDataRequests,
                    browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters},
                    editNewsletter: {method: 'PUT', path: `/newsletters/${responseFixtures.newsletters.newsletters[0].id}/?include=count.active_members%2Ccount.posts`, response: {
                        newsletters: [responseFixtures.newsletters.newsletters[0]],
                        meta: {
                            sent_email_verification: ['sender_reply_to']
                        }
                    }},
                    browseConfig: {
                        ...globalDataRequests.browseConfig,
                        response: {
                            config: {
                                ...responseFixtures.config.config,
                                hostSettings: {
                                    managedEmail: {
                                        enabled: true
                                    }
                                }
                            }
                        }
                    }
                }});

                await page.goto('/');
                const section = page.getByTestId('newsletters');
                await section.getByText('Awesome newsletter').click();
                const modal = page.getByTestId('newsletter-modal');
                const replyToEmail = modal.getByLabel('Reply-to email');

                await replyToEmail.fill('not-an-email');
                await modal.getByRole('button', {name: 'Save'}).click();

                await expect(modal).toHaveText(/Enter a valid email address/);

                await replyToEmail.fill('test@test.com');
                await modal.getByRole('button', {name: 'Save'}).click();

                await expect(page.getByTestId('toast-info')).toHaveCount(1);
                await expect(page.getByTestId('toast-info')).toHaveText(/sent a confirmation email to the new address/);
            });
        });

        test.describe('For Ghost (Pro) users with custom sending domain', () => {
            test('The sender email address can be changed partially (username but not domain name)', async ({page}) => {
                await mockApi({page, requests: {
                    ...globalDataRequests,
                    browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters},
                    editNewsletter: {method: 'PUT', path: `/newsletters/${responseFixtures.newsletters.newsletters[0].id}/?include=count.active_members%2Ccount.posts`, response: {
                        newsletters: [responseFixtures.newsletters.newsletters[0]],
                        meta: {
                            sent_email_verification: []
                        }
                    }},
                    browseConfig: {
                        ...globalDataRequests.browseConfig,
                        response: {
                            config: {
                                ...responseFixtures.config.config,
                                hostSettings: {
                                    managedEmail: {
                                        enabled: true,
                                        sendingDomain: 'customdomain.com'
                                    }
                                }
                            }
                        }
                    }
                }});

                await page.goto('/');
                const section = page.getByTestId('newsletters');
                await section.getByText('Awesome newsletter').click();
                const modal = page.getByTestId('newsletter-modal');
                const senderEmail = modal.getByLabel('Sender email');

                // Error case #1: add invalid email address
                await senderEmail.fill('Harry Potter');
                await modal.getByRole('button', {name: 'Save'}).click();
                await expect(modal).toHaveText(/Enter a valid email address/);

                // Error case #2: the sender email address doesn't match the custom sending domain
                await senderEmail.fill('harry@potter.com');
                await modal.getByRole('button', {name: 'Save'}).click();
                await expect(modal).toHaveText(/Email address must end with @customdomain.com/);

                // But can have any address on the same domain, without verification
                await senderEmail.fill('harry@customdomain.com');
                await modal.getByRole('button', {name: 'Save'}).click();
                await expect(page.getByTestId('confirmation-modal')).toHaveCount(0);
            });

            test('Allow full customisation of the reply-to address, with verification', async ({page}) => {
                await mockApi({page, requests: {
                    ...globalDataRequests,
                    browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters},
                    editNewsletter: {method: 'PUT', path: `/newsletters/${responseFixtures.newsletters.newsletters[0].id}/?include=count.active_members%2Ccount.posts`, response: {
                        newsletters: [responseFixtures.newsletters.newsletters[0]],
                        meta: {
                            sent_email_verification: ['sender_reply_to']
                        }
                    }},
                    browseConfig: {
                        ...globalDataRequests.browseConfig,
                        response: {
                            config: {
                                ...responseFixtures.config.config,
                                hostSettings: {
                                    managedEmail: {
                                        enabled: true,
                                        sendingDomain: 'customdomain.com'
                                    }
                                }
                            }
                        }
                    }
                }});

                await page.goto('/');
                const section = page.getByTestId('newsletters');
                await section.getByText('Awesome newsletter').click();
                const modal = page.getByTestId('newsletter-modal');
                const replyToEmail = modal.getByLabel('Reply-to email');

                // Full flexibility for the reply-to address
                await replyToEmail.fill('hermione@granger.com');
                expect(await replyToEmail.inputValue()).toBe('hermione@granger.com');

                // There is a verification popup for the new reply-to address
                await modal.getByRole('button', {name: 'Save'}).click();
                await expect(page.getByTestId('toast-info')).toHaveCount(1);
                await expect(page.getByTestId('toast-info')).toHaveText(/sent a confirmation email to the new address/);
            });
        });
    });

    test('Supports archiving newsletters', async ({page}) => {
        const activate = await mockApi({page, requests: {
            ...globalDataRequests,
            browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters},
            editNewsletter: {method: 'PUT', path: `/newsletters/${responseFixtures.newsletters.newsletters[1].id}/?include=count.active_members%2Ccount.posts`, response: {
                newsletters: [{
                    ...responseFixtures.newsletters.newsletters[1],
                    status: 'active'
                }]
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('newsletters');

        await section.getByRole('tab', {name: 'Archived'}).click();

        await section.getByText('Average newsletter').hover();
        await section.getByRole('button', {name: 'Edit'}).click();

        const archivedNewsletterModal = page.getByTestId('newsletter-modal');
        await archivedNewsletterModal.getByRole('button', {name: 'Reactivate newsletter'}).click();
        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Reactivate'}).click();
        await archivedNewsletterModal.getByRole('button', {name: 'Close'}).click();

        await section.getByRole('tab', {name: 'Active'}).click();

        await expect(section.getByText('Awesome newsletter')).toHaveCount(1);
        await expect(section.getByText('Average newsletter')).toHaveCount(1);

        expect(activate.lastApiRequests.editNewsletter?.body).toMatchObject({
            newsletters: [{
                id: responseFixtures.newsletters.newsletters[1].id,
                status: 'active'
            }]
        });

        const archive = await mockApi({page, requests: {
            ...globalDataRequests,
            browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters},
            editNewsletter: {method: 'PUT', path: `/newsletters/${responseFixtures.newsletters.newsletters[0].id}/?include=count.active_members%2Ccount.posts`, response: {
                newsletters: [{
                    ...responseFixtures.newsletters.newsletters[0],
                    status: 'archived'
                }]
            }}
        }});
        
        const awesomeNewsletterRow = section.getByRole('row', {name: /Awesome newsletter/});
        await awesomeNewsletterRow.hover();

        const editButton = awesomeNewsletterRow.getByTestId('edit-newsletter-button');
        await editButton.waitFor({state: 'visible', timeout: 5000});
        await editButton.click();

        const activeNewsletterModal = page.getByTestId('newsletter-modal');
        await activeNewsletterModal.getByRole('button', {name: 'Archive newsletter'}).click();
        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Archive'}).click();
        await activeNewsletterModal.getByRole('button', {name: 'Close'}).click();

        await section.getByRole('tab', {name: 'Archived'}).click();

        await expect(section.getByText('Awesome newsletter')).toHaveCount(1);

        expect(archive.lastApiRequests.editNewsletter?.body).toMatchObject({
            newsletters: [{
                id: responseFixtures.newsletters.newsletters[0].id,
                status: 'archived'
            }]
        });
    });

    test('Limits the number of newsletters', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...limitRequests,
            browseConfig: {
                ...globalDataRequests.browseConfig,
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        hostSettings: {
                            limits: {
                                newsletters: {
                                    max: 1,
                                    error: 'Your plan supports up to {{max}} newsletters. Please upgrade to add more.'
                                }
                            }
                        }
                    }
                }
            },
            browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters}
        }});

        await page.goto('/');

        const section = page.getByTestId('newsletters');

        await section.getByRole('button', {name: 'Add newsletter'}).click();

        await expect(page.getByTestId('limit-modal')).toHaveText(/Your plan supports up to 1 newsletters/);

        await page.getByTestId('limit-modal').getByRole('button', {name: 'Cancel'}).click();

        await section.getByRole('tab', {name: 'Archived'}).click();

        await section.getByText('Average newsletter').hover();
        await section.getByRole('button', {name: 'Edit'}).click();

        const newsletterModal = page.getByTestId('newsletter-modal');
        await newsletterModal.getByRole('button', {name: 'Reactivate newsletter'}).click();

        await expect(page.getByTestId('limit-modal')).toHaveText(/Your plan supports up to 1 newsletters/);
    });

    test('Warns when leaving without saving', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters},
            editNewsletter: {method: 'PUT', path: `/newsletters/${responseFixtures.newsletters.newsletters[1].id}/?include=count.active_members%2Ccount.posts`, response: responseFixtures.newsletters}
        }});

        await page.goto('/');

        const section = page.getByTestId('newsletters');
        await section.getByText('Awesome newsletter').click();

        const modal = page.getByTestId('newsletter-modal');

        await modal.getByPlaceholder('Weekly Roundup').fill('New title');

        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(page.getByTestId('confirmation-modal')).toHaveText(/leave/i);

        await page.getByTestId('confirmation-modal').getByRole('button', {name: 'Leave'}).click();

        await expect(modal).toBeHidden();
        expect(lastApiRequests.editNewsletter).toBeUndefined();
    });
});
