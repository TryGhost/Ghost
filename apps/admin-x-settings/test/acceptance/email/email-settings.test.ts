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

        const sectionIds = ['enable-newsletters', 'mailgun', 'default-recipients', 'newsletters', 'memberemails'];

        for (const sectionId of sectionIds) {
            await expect(page.getByTestId(sectionId)).toBeVisible();
        }

        const isInOrder = await page.evaluate((ids) => {
            const nodes = ids.map(id => document.querySelector(`[data-testid="${id}"]`));

            if (nodes.some(node => !node)) {
                return false;
            }

            return nodes.every((node, index) => {
                if (index === 0) {
                    return true;
                }

                return Boolean(nodes[index - 1]!.compareDocumentPosition(node!) & Node.DOCUMENT_POSITION_FOLLOWING);
            });
        }, sectionIds);

        expect(isInOrder).toBe(true);
    });

    test('Keeps welcome emails visible when newsletter sending is disabled', async ({page}) => {
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
        await expect(page.getByTestId('mailgun')).toHaveCount(0);
        await expect(page.getByTestId('default-recipients')).toHaveCount(0);
        await expect(page.getByTestId('newsletters')).toHaveCount(0);
        await expect(page.getByTestId('memberemails')).toBeVisible();
    });
});
