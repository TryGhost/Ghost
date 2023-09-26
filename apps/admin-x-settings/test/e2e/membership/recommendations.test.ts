import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, updatedSettingsResponse} from '../../utils/e2e';

const settingsWithStripe = updatedSettingsResponse([
    {key: 'stripe_connect_publishable_key', value: 'pk_test_123'},
    {key: 'stripe_connect_secret_key', value: 'sk_test_123'},
    {key: 'stripe_connect_display_name', value: 'Dummy'},
    {key: 'stripe_connect_account_id', value: 'acct_123'}
]);

test.describe('Recommendations settings', async () => {
    test.only('Supports creating a new recommendation', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseTiers: {method: 'GET', path: '/recommendations/?limit=all', response: responseFixtures.recommendations}
        }});

        await page.goto('');
        
        // Find recommendations
        const recommendationsSection = page.getByTestId('recommendations');

        await recommendationsSection.getByTestId('add-recommendation-button').click();

        await recommendationsSection.getByRole('button', {name: 'Add recommendation'}).click();

        const modal = page.getByTestId('add-recommendation-modal');

        await modal.getByRole('button', {name: 'Next'}).click();

        await expect(modal).toHaveText(/Please enter a valid URL./);

        await modal.getByLabel('URL').fill('https://main.ghost.org');

        await modal.getByRole('button', {name: 'Next'}).click();

        await expect(modal).toHaveText(/Preview/);
        
        await expect(modal.getByLabel('Title')).toHaveText(/Main X/);
        await expect(modal.getByLabel('Short description')).toHaveText(/Main X/);

        await modal.getByRole('button', {name: 'Add'}).click();

        await expect(page.getByTestId('toast')).toHaveText(/Successfully added a recommendation/);
    });
});
