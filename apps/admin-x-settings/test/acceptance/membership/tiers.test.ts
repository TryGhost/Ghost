import {expect, test} from '@playwright/test';
import {globalDataRequests} from '../../utils/acceptance';
import {mockApi, responseFixtures, settingsWithStripe} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Tier settings', async () => {
    test('Supports creating a new tier', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers}
        }});

        await page.goto('/');

        const section = page.getByTestId('tiers');

        await section.getByRole('button', {name: 'Add tier'}).click();

        const modal = page.getByTestId('tier-detail-modal');

        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).toHaveText(/Enter a name for the tier/);
        await expect(modal).toHaveText(/Amount must be at least \$1/);

        await modal.getByLabel('Name').fill('Plus tier');
        await modal.getByLabel('Monthly price').fill('8');
        await modal.getByLabel('Yearly price').fill('80');

        const newTier = {
            id: 'new-tier',
            type: 'paid',
            active: true,
            name: 'Plus tier',
            slug: 'plus-tier',
            description: null,
            monthly_price: 800,
            yearly_price: 8000,
            benefits: [],
            welcome_page_url: null,
            trial_days: 0,
            visibility: 'public',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            addTier: {method: 'POST', path: '/tiers/', response: {tiers: [newTier]}},
            // This request will be reloaded after the new tier is added
            browseTiers: {method: 'GET', path: '/tiers/', response: {tiers: [...responseFixtures.tiers.tiers, newTier]}}
        }});

        await modal.getByRole('button', {name: 'Save'}).click();
        await modal.getByRole('button', {name: 'Close'}).click();

        // await expect(section.getByTestId('tier-card').filter({hasText: /Plus/})).toHaveText(/Plus tier/);
        // await expect(section.getByTestId('tier-card').filter({hasText: /Plus/})).toHaveText(/\$8\/month/);

        expect(lastApiRequests.addTier?.body).toMatchObject({
            tiers: [{
                name: 'Plus tier',
                monthly_price: 800,
                yearly_price: 8000,
                trial_days: null
            }]
        });
    });

    test('Supports updating a tier', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers},
            editTier: {method: 'PUT', path: `/tiers/${responseFixtures.tiers.tiers[1].id}/`, response: {
                tiers: [{
                    ...responseFixtures.tiers.tiers[1],
                    name: 'Supporter updated',
                    description: 'Supporter description',
                    monthly_price: 1001,
                    trial_days: 7,
                    benefits: [
                        'Simple benefit',
                        'New benefit'
                    ]
                }]
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('tiers');

        await section.getByTestId('tier-card').filter({hasText: /Supporter/}).click();

        const modal = page.getByTestId('tier-detail-modal');

        const preview = await modal.getByTestId('tier-preview');

        await expect(preview).toContainText('Basic Supporter');
        await expect(preview).toContainText('$5/month');
        await expect(preview).toContainText('Simple benefit');

        // Failing validations

        await modal.getByLabel('Name').fill('');
        await modal.getByRole('button', {name: 'Save'}).click();

        await expect(modal).toHaveText(/Enter a name for the tier/);

        // Valid values

        await modal.getByLabel('Name').fill('Supporter updated');
        await modal.getByLabel('Description').fill('Supporter description');
        await modal.getByLabel('Monthly price').fill('10.01');
        await modal.getByLabel('Yearly price').fill('100');
        await modal.getByLabel('Add a free trial').check();
        await modal.getByLabel('Trial days').fill('7');
        await modal.getByLabel('New benefit').fill('New benefit');
        await modal.getByRole('button', {name: 'Add'}).click();

        // Check that the preview is updated

        await expect(preview).toContainText('Supporter updated');
        await expect(preview).toContainText('Supporter description');
        await expect(preview).toContainText('$10.01/month');
        await expect(preview).toContainText('New benefit');

        await preview.getByRole('button', {name: 'Yearly'}).click();
        await expect(preview).not.toContainText('$10.01/month');
        await expect(preview).toContainText('$100/year');
        await expect(preview).toContainText('17% discount');

        // Save changes

        await modal.getByRole('button', {name: 'Save'}).click();
        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(section.getByTestId('tier-card').filter({hasText: /Supporter/})).toHaveText(/Supporter updated/);
        await expect(section.getByTestId('tier-card').filter({hasText: /Supporter/})).toHaveText(/Supporter description/);
        await expect(section.getByTestId('tier-card').filter({hasText: /Supporter/})).toHaveText(/\$10\.01\/month/);

        expect(lastApiRequests.editTier?.body).toMatchObject({
            tiers: [{
                id: responseFixtures.tiers.tiers[1].id,
                name: 'Supporter updated',
                description: 'Supporter description',
                monthly_price: 1001,
                yearly_price: 10000,
                trial_days: 7,
                benefits: [
                    'Simple benefit',
                    'New benefit'
                ]
            }]
        });
    });

    test('Supports editing the free tier', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers},
            editTier: {method: 'PUT', path: `/tiers/${responseFixtures.tiers.tiers[0].id}/`, response: {
                tiers: [{
                    ...responseFixtures.tiers.tiers[0],
                    description: 'Free tier description',
                    benefits: [
                        'First benefit',
                        'Second benefit'
                    ]
                }]
            }}
        }});

        await page.goto('/');

        const section = page.getByTestId('tiers');

        await section.getByTestId('tier-card').filter({hasText: /Free/}).click();

        const modal = page.getByTestId('tier-detail-modal');

        await modal.getByLabel('Description').fill('Free tier description');
        await modal.getByLabel('Welcome page').fill('welcome-page');
        await modal.getByLabel('New benefit').fill('First benefit');
        await modal.getByRole('button', {name: 'Add'}).click();
        await modal.getByLabel('New benefit').fill('Second benefit');

        await modal.getByRole('button', {name: 'Save'}).click();
        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(section.getByTestId('tier-card').filter({hasText: /Free/})).toHaveText(/Free tier description/);

        expect(lastApiRequests.editTier?.body).toMatchObject({
            tiers: [{
                id: responseFixtures.tiers.tiers[0].id,
                description: 'Free tier description',
                welcome_page_url: '/welcome-page/',
                benefits: [
                    'First benefit',
                    'Second benefit'
                ]
            }]
        });
    });
});
