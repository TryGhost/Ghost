import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, updatedSettingsResponse, waitForApiRequest} from '@tryghost/admin-x-framework/test/acceptance';

const emailRequests = {
    browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters},
    browseNewslettersLimit: {method: 'GET', path: '/newsletters/?filter=status%3Aactive&limit=1', response: responseFixtures.newsletters},
    browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: {automated_emails: []}}
};

const configWithAutomations = {
    ...responseFixtures.config,
    config: {
        ...responseFixtures.config.config,
        labs: {
            ...responseFixtures.config.config.labs,
            automations: true
        }
    }
};

test.describe('Email settings', async () => {
    test('Shows newsletter sections in the expected order', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...emailRequests
        }});

        await page.goto('/');

        const expectedOrder = ['enable-newsletters', 'default-recipients', 'newsletters', 'mailgun'];

        for (const sectionId of expectedOrder) {
            await expect(page.getByTestId(sectionId)).toBeVisible();
        }

        const actualOrder = await page.evaluate((ids) => {
            const allTestIds = [...document.querySelectorAll('[data-testid]')]
                .map(el => el.getAttribute('data-testid'));
            return ids.filter(id => allTestIds.includes(id));
        }, expectedOrder);

        expect(actualOrder).toEqual(expectedOrder);
    });

    test('Keeps welcome emails visible in membership when newsletter sending is disabled', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...emailRequests,
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: updatedSettingsResponse([
                    {key: 'editor_default_email_recipients', value: 'disabled'},
                    {key: 'editor_default_email_recipients_filter', value: null}
                ])
            }
        }});

        await page.goto('/');

        await expect(page.getByTestId('enable-newsletters')).toBeVisible();
        await expect(page.getByTestId('mailgun')).toBeHidden();
        await expect(page.getByTestId('default-recipients')).toBeHidden();
        await expect(page.getByTestId('newsletters')).toBeHidden();
        await expect(page.getByTestId('memberemails')).toBeVisible();
    });

    test('verifies newsletter emails from existing newsletters verification links when automations are enabled', async ({page}) => {
        const verifyNewsletterEmailResponse = {
            ...responseFixtures.newsletters,
            meta: {
                ...responseFixtures.newsletters.meta,
                email_verified: 'sender_email'
            }
        };
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            ...emailRequests,
            browseConfig: {...globalDataRequests.browseConfig, response: configWithAutomations},
            verifyNewsletterEmail: {method: 'PUT', path: /^\/newsletters\/verifications\/\?include=/, response: verifyNewsletterEmailResponse}
        }});

        await page.goto('/#/settings/newsletters/?verifyEmail=fake-token');

        const verifyNewsletterEmail = await waitForApiRequest(lastApiRequests, 'verifyNewsletterEmail');
        expect(verifyNewsletterEmail.body).toEqual({token: 'fake-token'});
    });

    test('verifies automation emails from existing memberemails verification links when automations are enabled', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            ...emailRequests,
            browseConfig: {...globalDataRequests.browseConfig, response: configWithAutomations},
            verifyAutomatedEmailSender: {
                method: 'PUT',
                path: /^\/automated_emails\/verifications\/?$/,
                response: {
                    automated_emails: [],
                    meta: {
                        email_verified: 'sender_reply_to'
                    }
                }
            }
        }});

        await page.goto('/#/settings/memberemails?verifyEmail=fake-token');

        const verifyAutomatedEmailSender = await waitForApiRequest(lastApiRequests, 'verifyAutomatedEmailSender');
        expect(verifyAutomatedEmailSender.body).toEqual({token: 'fake-token'});
    });

    test('finds transactional email settings in search when automations are enabled', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...emailRequests,
            browseConfig: {...globalDataRequests.browseConfig, response: configWithAutomations}
        }});

        await page.goto('/');
        await page.getByPlaceholder('Search settings').fill('transactional');

        await expect(page.getByTestId('sidebar').getByText('Email')).toBeVisible();
        await expect(page.getByText('No result')).toHaveCount(0);
    });

    test('keeps transactional email settings reachable when newsletters are disabled with automations enabled', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {...globalDataRequests.browseConfig, response: configWithAutomations},
            browseSettings: {
                ...globalDataRequests.browseSettings,
                response: updatedSettingsResponse([
                    {key: 'editor_default_email_recipients', value: 'disabled'},
                    {key: 'editor_default_email_recipients_filter', value: null}
                ])
            }
        }});

        await page.goto('/');

        const emailsSection = page.getByTestId('emails');
        await expect(emailsSection).toBeVisible();
        await expect(emailsSection.getByRole('tab', {name: 'Automation emails'})).toBeVisible();
        await expect(emailsSection.getByRole('tab', {name: 'Newsletters'})).toHaveCount(0);
        await expect(emailsSection.getByRole('button', {name: 'Add newsletter'})).toHaveCount(0);
        await expect(page.getByTestId('mailgun')).toBeHidden();
        await expect(page.getByTestId('default-recipients')).toBeHidden();
    });
});
