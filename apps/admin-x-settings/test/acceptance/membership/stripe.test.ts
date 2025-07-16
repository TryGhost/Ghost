import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, updatedSettingsResponse} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Stripe settings', async () => {
    test('Supports the Stripe Connect flow', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'stripe_connect_display_name', value: 'Dummy'},
                {key: 'stripe_connect_livemode', value: false},
                {key: 'stripe_connect_account_id', value: 'acct_123'},
                {key: 'stripe_connect_publishable_key', value: 'pk_test_123'},
                {key: 'stripe_connect_secret_key', value: 'sk_test_123'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('tiers');

        await section.getByRole('button', {name: 'Connect with Stripe'}).click();

        const modal = page.getByTestId('stripe-modal');
        await modal.getByRole('button', {name: /I have a Stripe account/}).click();

        await expect(modal.locator('a', {hasText: 'Connect with Stripe'})).toHaveAttribute('href', '/ghost/api/admin/members/stripe_connect?mode=live');
        await modal.getByLabel('Test mode').check();
        await expect(modal.locator('a', {hasText: 'Connect with Stripe'})).toHaveAttribute('href', '/ghost/api/admin/members/stripe_connect?mode=test');

        await modal.getByPlaceholder('Paste your secure key here').fill('token_test');
        await modal.getByRole('button', {name: 'Save Stripe settings'}).click();

        await expect(modal.getByText('You are connected with Stripe!')).toHaveCount(1);
        await modal.getByRole('button', {name: 'Close'}).click();

        await expect(modal).toHaveCount(0);

        // There's a mobile version of the same button in the DOM
        await expect(section.getByText('Connected to Stripe')).toHaveCount(2);

        // We actually do two settings update requests here, this just checks the last one
        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [{
                key: 'portal_plans',
                value: '["free","monthly","yearly"]'
            }]
        });
    });

    test('Supports updating Stripe Direct settings', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseConfig: {method: 'GET', path: '/config/', response: {
                config: {
                    ...responseFixtures.config.config,
                    stripeDirect: true
                }
            }},
            editSettings: {method: 'PUT', path: '/settings/', response: updatedSettingsResponse([
                {key: 'stripe_publishable_key', value: 'pk_test_123'},
                {key: 'stripe_secret_key', value: 'sk_test_123'}
            ])}
        }});

        await page.goto('/');

        const section = page.getByTestId('tiers');

        await section.getByRole('button', {name: 'Connect with Stripe'}).click();

        const modal = page.getByTestId('stripe-modal');
        await modal.getByLabel('Publishable key').fill('pk_test_123');
        await modal.getByLabel('Secure key').fill('sk_test_123');
        await modal.getByRole('button', {name: 'Save Stripe settings'}).click();

        await expect(modal).toHaveCount(0);

        // There's a mobile version of the same button in the DOM
        await expect(section.getByText('Connected to Stripe')).toHaveCount(2);

        expect(lastApiRequests.editSettings?.body).toEqual({
            settings: [{
                key: 'stripe_secret_key',
                value: 'sk_test_123'
            }, {
                key: 'stripe_publishable_key',
                value: 'pk_test_123'
            }]
        });
    });
});
