import {expect, test} from '@playwright/test';
import {mockApi, responseFixtures} from '../../utils/e2e';

test.describe('Tier settings', async () => {
    test('Supports creating a new tier', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            tiers: {
                add: {
                    tiers: [{
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
                    }]
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('tiers');

        await section.getByRole('button', {name: 'Add tier'}).click();

        const modal = page.getByTestId('tier-detail-modal');

        await modal.getByRole('button', {name: 'Save & close'}).click();

        await expect(page.getByTestId('toast')).toHaveText(/One or more fields have errors/);
        await expect(modal).toHaveText(/You must specify a name/);
        await expect(modal).toHaveText(/Subscription amount must be at least \$1\.00/);

        await modal.getByLabel('Name').fill('Plus tier');
        await modal.getByLabel('Monthly price').fill('8');
        await modal.getByLabel('Yearly price').fill('80');

        await modal.getByRole('button', {name: 'Save & close'}).click();

        await expect(section.getByTestId('tier-card').filter({hasText: /Plus/})).toHaveText(/Plus tier/);
        await expect(section.getByTestId('tier-card').filter({hasText: /Plus/})).toHaveText(/\$8\/month/);

        expect(lastApiRequests.tiers.add.body).toMatchObject({
            tiers: [{
                name: 'Plus tier',
                monthly_price: 800,
                yearly_price: 8000,
                trial_days: null
            }]
        });
    });

    test('Supports updating a tier', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            tiers: {
                edit: {
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
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('tiers');

        await section.getByTestId('tier-card').filter({hasText: /Supporter/}).click();

        const modal = page.getByTestId('tier-detail-modal');

        await modal.getByLabel('Name').fill('');
        await modal.getByRole('button', {name: 'Save & close'}).click();

        await expect(page.getByTestId('toast')).toHaveText(/One or more fields have errors/);
        await expect(modal).toHaveText(/You must specify a name/);

        await modal.getByLabel('Name').fill('Supporter updated');
        await modal.getByLabel('Description').fill('Supporter description');
        await modal.getByLabel('Monthly price').fill('10.01');
        await modal.getByLabel('Add a free trial').check();
        await modal.getByLabel('Trial days').fill('7');
        await modal.getByLabel('New benefit').fill('New benefit');
        await modal.getByRole('button', {name: 'Add'}).click();

        await modal.getByRole('button', {name: 'Save & close'}).click();

        await expect(section.getByTestId('tier-card').filter({hasText: /Supporter/})).toHaveText(/Supporter updated/);
        await expect(section.getByTestId('tier-card').filter({hasText: /Supporter/})).toHaveText(/Supporter description/);
        await expect(section.getByTestId('tier-card').filter({hasText: /Supporter/})).toHaveText(/\$10\.01\/month/);

        expect(lastApiRequests.tiers.edit.body).toMatchObject({
            tiers: [{
                id: responseFixtures.tiers.tiers[1].id,
                name: 'Supporter updated',
                description: 'Supporter description',
                monthly_price: 1001,
                trial_days: 7,
                benefits: [
                    'Simple benefit',
                    'New benefit'
                ]
            }]
        });
    });

    test('Supports editing the free tier', async ({page}) => {
        const lastApiRequests = await mockApi({page, responses: {
            tiers: {
                edit: {
                    tiers: [{
                        ...responseFixtures.tiers.tiers[0],
                        description: 'Free tier description',
                        benefits: [
                            'First benefit',
                            'Second benefit'
                        ]
                    }]
                }
            }
        }});

        await page.goto('/');

        const section = page.getByTestId('tiers');

        await section.getByTestId('tier-card').filter({hasText: /Free/}).click();

        const modal = page.getByTestId('tier-detail-modal');

        await modal.getByLabel('Description').fill('Free tier description');
        await modal.getByLabel('New benefit').fill('First benefit');
        await modal.getByRole('button', {name: 'Add'}).click();
        await modal.getByLabel('New benefit').fill('Second benefit');

        await modal.getByRole('button', {name: 'Save & close'}).click();

        await expect(section.getByTestId('tier-card').filter({hasText: /Free/})).toHaveText(/Free tier description/);

        expect(lastApiRequests.tiers.edit.body).toMatchObject({
            tiers: [{
                id: responseFixtures.tiers.tiers[0].id,
                description: 'Free tier description',
                benefits: [
                    'First benefit',
                    'Second benefit'
                ]
            }]
        });
    });
});
