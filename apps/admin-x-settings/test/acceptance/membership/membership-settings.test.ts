import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

const emailRequests = {
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

test.describe('Membership settings', () => {
    test('shows welcome emails when the automations labs flag is off', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...emailRequests
        }});

        await page.goto('/');

        await expect(page.getByTestId('memberemails')).toBeVisible();
        await expect(page.getByTestId('sidebar').getByText('Welcome emails')).toBeVisible();
    });

    test('hides welcome emails when the automations labs flag is on', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            ...emailRequests,
            browseConfig: {...globalDataRequests.browseConfig, response: configWithAutomations}
        }});

        await page.goto('/');

        await expect(page.getByTestId('memberemails')).toHaveCount(0);
        await expect(page.getByTestId('sidebar').getByText('Welcome emails')).toHaveCount(0);
    });
});
