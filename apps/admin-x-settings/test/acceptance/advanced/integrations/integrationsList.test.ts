import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../../utils/acceptance';
import {mockApi, responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Integrations List', async () => {
    // This is a test for the integrations list, which is a list of integrations that can be toggled on and off
    // To ensure the app logic shows the correct initial state, all integrations are disabled by default, except for Unsplash
    test('Only Unsplash Shows Active on initial new setup', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            getSettingValue: {method: 'GET', path: '/settings/', response: responseFixtures.settings}
        }});
        await page.goto('/');
        const section = page.getByTestId('integrations');
        // const zapierElement = await section.getByText('Zapier').last();
        const zapierElement = section.getByTestId('zapier-integration');
        const slackElement = section.getByTestId('slack-integration');
        const unsplashElement = section.getByTestId('unsplash-integration');
        const firstPromoterElement = section.getByTestId('firstpromoter-integration');
        const pinturaElement = section.getByTestId('pintura-integration');

        const zapierStatus = await zapierElement.getByText('Active');
        const slackStatus = await slackElement.getByText('Active');
        const unsplashStatus = await unsplashElement.getByText('Active');
        const firstPromoterStatus = await firstPromoterElement.getByText('Active');
        const pinturaStatus = await pinturaElement.getByText('Active');

        expect(await zapierStatus.isVisible()).toBe(false);
        expect(await slackStatus.isVisible()).toBe(false);
        expect(await unsplashStatus.isVisible()).toBe(true); // Unsplash is the only active integration
        expect(await firstPromoterStatus.isVisible()).toBe(false);
        expect(await pinturaStatus.isVisible()).toBe(false);
    });
});
