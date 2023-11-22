import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, settingsWithStripe, toggleLabsFlag} from '@tryghost/admin-x-framework/test/acceptance';

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

    test('Supports updating an offer', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseOffers: {method: 'GET', path: '/offers/?limit=all', response: responseFixtures.offers},
            browseOffersById: {method: 'GET', path: `/offers/${responseFixtures.offers.offers[0].id}/`, response: responseFixtures.offers},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers},
            editOffer: {method: 'PUT', path: `/offers/${responseFixtures.offers.offers[0].id}/`, response: {
                offers: [{
                    id: responseFixtures.offers.offers[0].id,
                    name: 'Updated offer',
                    body_font_category: 'sans_serif'
                }]
            }}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await expect(modal).toContainText('Active offers');
        await expect(modal).toContainText('First offer');
        await modal.getByText('First offer').click();

        const offerUpdateModal = page.getByTestId('offer-update-modal');
        await expect(offerUpdateModal).toBeVisible();

        await offerUpdateModal.getByPlaceholder('black-friday').fill('');
        await offerUpdateModal.getByRole('button', {name: 'Save'}).click();

        await expect(page.getByTestId('toast-error')).toContainText(/Can't save offer, please double check that you've filled all mandatory fields./);
        await expect(offerUpdateModal).toContainText(/Please enter a code/);

        await offerUpdateModal.getByPlaceholder('black-friday').fill('black-friday-offer');

        await offerUpdateModal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editOffer?.body).toMatchObject({
            offers: [{
                id: responseFixtures.offers.offers[0].id,
                name: 'First offer',
                code: 'black-friday-offer'
            }]
        });
    });
});
