import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, settingsWithStripe, toggleLabsFlag} from '../../utils/acceptance';

test.describe('Offers Modal', () => {
    test.beforeEach(async () => {
        toggleLabsFlag('adminXOffers', true);
    });

    test('Offers Modal is available', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe}
        }});
        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await expect(modal).toBeVisible();
    });

    test('Can view active offers', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseOffers: {method: 'GET', path: '/offers/?limit=all', response: responseFixtures.offers},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await expect(modal).toContainText('Active offers');
        await expect(modal).toContainText('First offer');
        await expect(modal).toContainText('Second offer'); 
    });

    test('Can view archived offers', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseOffers: {method: 'GET', path: '/offers/?limit=all', response: responseFixtures.offers},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await modal.getByText('Archived').click();
        await expect(modal).toContainText('Archived offers');
        await expect(modal).toContainText('Third offer'); 
    });
});
