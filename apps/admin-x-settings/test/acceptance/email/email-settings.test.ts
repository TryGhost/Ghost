import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

const emailRequests = {
    browseNewsletters: {method: 'GET', path: '/newsletters/?include=count.active_members%2Ccount.posts&limit=50', response: responseFixtures.newsletters},
    browseNewslettersLimit: {method: 'GET', path: '/newsletters/?filter=status%3Aactive&limit=1', response: responseFixtures.newsletters},
    browseAutomatedEmails: {method: 'GET', path: '/automated_emails/', response: {automated_emails: []}}
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
});
