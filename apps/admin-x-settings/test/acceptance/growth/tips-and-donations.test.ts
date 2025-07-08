import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, settingsWithStripe} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Tips and donations', () => {
    test('Is not shown when Stripe is disabled', async ({page}) => {
        await mockApi({page, requests: {...globalDataRequests}});
        await page.goto('/');

        await expect(page.locator('[data-setting-nav-item] #tips-and-donations')).not.toBeVisible();
        await expect(page.getByTestId('tips-and-donations')).not.toBeVisible();
    });

    test('Shows suggested amount and shareable link when Stripe is enabled', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe}
        }});
        await page.goto('/');

        const section = page.getByTestId('tips-and-donations');

        await expect(page.locator('[data-setting-nav-item] #tips-and-donations')).toBeVisible();
        await expect(section).toBeVisible();

        const suggestedAmountInput = section.getByRole('textbox', {name: 'Suggested amount'});
        await expect(suggestedAmountInput).toBeVisible();
        await expect(suggestedAmountInput).toHaveValue('5');

        await expect(section.getByRole('combobox')).toBeVisible();

        const donateUrl = section.getByTestId('donate-url');
        await expect(donateUrl).toBeVisible();
        await expect(donateUrl).toHaveText('http://test.com/#/portal/support');

        await expect(section.getByTestId('preview-shareable-link')).not.toBeVisible();
        await expect(section.getByTestId('copy-shareable-link')).not.toBeVisible();

        await donateUrl.hover();

        await expect(section.getByTestId('preview-shareable-link')).toBeVisible();
        await expect(section.getByTestId('copy-shareable-link')).toBeVisible();
    });
});
