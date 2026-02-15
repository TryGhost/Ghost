import {expect, test} from '@playwright/test';
import {globalDataRequests, mockApi, responseFixtures, settingsWithStripe} from '@tryghost/admin-x-framework/test/acceptance';

test.describe('Offers Modal', () => {
    test('Offers Modal is available', async ({page}) => {
        await mockApi({page, requests: {
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers}
        }});
        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Add offer'}).click();
        const addModal = page.getByTestId('add-offer-modal');
        await expect(addModal).toBeVisible();
    });

    test('Offers Add Modal is available', async ({page}) => {
        await mockApi({page, requests: {
            browseOffers: {method: 'GET', path: '/offers/', response: responseFixtures.offers},
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers},
            addOffer: {method: 'POST', path: '/offers/', response: {
                offers: [{
                    id: 'new-offer',
                    name: 'New offer',
                    code: 'new-offer'
                }]
            }}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await modal.getByRole('button', {name: 'New offer'}).click();
        const addModal = page.getByTestId('add-offer-modal');
        await expect(addModal).toBeVisible();
    });

    test('Can add a new offer', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            browseOffers: {method: 'GET', path: '/offers/', response: responseFixtures.offers},
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseOffersById: {method: 'GET', path: `/offers/${responseFixtures.offers.offers![0].id}/`, response: responseFixtures.offers},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers},
            addOffer: {method: 'POST', path: `/offers/`, response: {
                offers: [{
                    name: 'Coffee Tuesdays',
                    id: '6487ea6464fca78ec2fff5fe',
                    code: 'coffee-tuesdays',
                    amount: 5
                }]
            }}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await modal.getByRole('button', {name: 'New offer'}).click();
        const addModal = page.getByTestId('add-offer-modal');
        expect(addModal).toBeVisible();
        const sidebar = addModal.getByTestId('add-offer-sidebar');
        expect(sidebar).toBeVisible();
        await sidebar.getByPlaceholder(/^Black Friday$/).fill('Coffee Tuesdays');
        await sidebar.getByLabel('Amount off').fill('5');

        await addModal.getByRole('button', {name: 'Publish'}).click();
        expect(lastApiRequests.addOffer?.body).toMatchObject({
            offers: [{
                name: 'Coffee Tuesdays',
                code: 'coffee-tuesdays'
            }]
        });
        const successModal = page.getByTestId('offer-success-modal');
        await expect(successModal).toBeVisible();
    });

    test('Errors if required fields are missing', async ({page}) => {
        await mockApi({page, requests: {
            browseOffers: {method: 'GET', path: '/offers/', response: responseFixtures.offers},
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseOffersById: {method: 'GET', path: `/offers/${responseFixtures.offers.offers![0].id}/`, response: responseFixtures.offers},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers},
            addOffer: {method: 'POST', path: `/offers/`, response: {
                offers: [{
                    name: 'Coffee Tuesdays',
                    id: '6487ea6464fca78ec2fff5fe',
                    code: 'coffee-tuesdays',
                    amount: 5
                }]
            }}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await modal.getByRole('button', {name: 'New offer'}).click();
        const addModal = page.getByTestId('add-offer-modal');
        await addModal.getByRole('button', {name: 'Publish'}).click();
        const sidebar = addModal.getByTestId('add-offer-sidebar');
        await expect(sidebar).toContainText(/Name is required/);
        await expect(sidebar).toContainText(/Code is required/);
        await expect(sidebar).toContainText(/Enter an amount greater than 0./);
        await expect(sidebar).toContainText(/Display title is required/);
    });

    test('Errors if the offer code is already taken', async ({page}) => {
        await mockApi({page, requests: {
            browseOffers: {method: 'GET', path: '/offers/', response: responseFixtures.offers},
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseOffersById: {method: 'GET', path: `/offers/${responseFixtures.offers.offers![0].id}/`, response: responseFixtures.offers},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers},
            addOffer: {method: 'POST', path: `/offers/`, responseStatus: 400, responseHeaders: {'content-type': 'json'}, response: {
                errors: [{
                    message: 'Validation error, cannot edit offer.',
                    context: 'Offer `code` must be unique. Please change and try again.'
                }]
            }}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await modal.getByRole('button', {name: 'New offer'}).click();
        const addModal = page.getByTestId('add-offer-modal');
        expect(addModal).toBeVisible();
        const sidebar = addModal.getByTestId('add-offer-sidebar');
        expect(sidebar).toBeVisible();
        await sidebar.getByPlaceholder(/^Black Friday$/).fill('Coffee Tuesdays');
        await sidebar.getByLabel('Amount off').fill('10');
        await addModal.getByRole('button', {name: 'Publish'}).click();

        await expect(page.getByTestId('toast-error')).toContainText(/Offer `code` must be unique. Please change and try again./);
    });

    test('Shows validation hints', async ({page}) => {
        await mockApi({page, requests: {
            browseOffers: {method: 'GET', path: '/offers/', response: responseFixtures.offers},
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseOffersById: {method: 'GET', path: `/offers/${responseFixtures.offers.offers![0].id}/`, response: responseFixtures.offers},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers},
            addOffer: {method: 'POST', path: `/offers/`, response: {
                offers: [{
                    name: 'Coffee Tuesdays',
                    id: '6487ea6464fca78ec2fff5fe',
                    code: 'coffee-tuesdays',
                    amount: 5
                }]
            }}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await modal.getByRole('button', {name: 'New offer'}).click();
        const addModal = page.getByTestId('add-offer-modal');
        await addModal.getByRole('button', {name: 'Publish'}).click();
        const sidebar = addModal.getByTestId('add-offer-sidebar');
        await expect(sidebar).toContainText(/Name is required/);
        await expect(sidebar).toContainText(/Code is required/);
        await expect(sidebar).toContainText(/Enter an amount greater than 0./);
        await expect(sidebar).toContainText(/Display title is required/);
    });

    test('Can view active offers', async ({page}) => {
        await mockApi({page, requests: {
            browseOffers: {method: 'GET', path: '/offers/', response: responseFixtures.offers},
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseAllOffers: {method: 'GET', path: '/offers/', response: responseFixtures.offers},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        const manageButton = section.getByRole('button', {name: 'Manage offers'});
        await expect(manageButton).toBeVisible();
        await manageButton.click();
        const modal = page.getByTestId('offers-modal');
        await expect(modal).toBeVisible();
        await expect(modal.getByText('Active')).toHaveAttribute('aria-selected', 'true');
        await expect(modal).toContainText('First offer');
        await expect(modal).toContainText('Second offer');
    });

    test('Can view archived offers', async ({page}) => {
        await mockApi({page, requests: {
            browseOffers: {method: 'GET', path: '/offers/', response: responseFixtures.offers},
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseAllOffers: {method: 'GET', path: '/offers/', response: responseFixtures.offers},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await modal.getByText('Archived').click();
        await expect(modal.getByText('Archived')).toHaveAttribute('aria-selected', 'true');
        await expect(modal).toContainText('Third offer');
    });

    test('Supports updating an offer', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            browseOffers: {method: 'GET', path: '/offers/', response: responseFixtures.offers},
            ...globalDataRequests,
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseAllOffers: {method: 'GET', path: '/offers/?', response: responseFixtures.offers},
            browseOffersById: {method: 'GET', path: `/offers/${responseFixtures.offers.offers![0].id}/`, response: responseFixtures.offers},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers},
            editOffer: {method: 'PUT', path: `/offers/${responseFixtures.offers.offers![0].id}/`, response: {
                offers: [{
                    id: responseFixtures.offers.offers![0].id,
                    name: 'Updated offer',
                    body_font_category: 'sans_serif'
                }]
            }}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();
        const modal = page.getByTestId('offers-modal');
        await expect(modal.getByText('Active')).toHaveAttribute('aria-selected', 'true');
        await expect(modal).toContainText('First offer');
        await modal.getByText('First offer').click();

        const offerUpdateModal = page.getByTestId('offer-update-modal');
        await expect(offerUpdateModal).toBeVisible();

        await offerUpdateModal.getByPlaceholder('black-friday').fill('');
        await offerUpdateModal.getByRole('button', {name: 'Save'}).click();

        await expect(offerUpdateModal).toContainText(/Please enter a code/);

        await offerUpdateModal.getByPlaceholder('black-friday').fill('black-friday-offer');

        await offerUpdateModal.getByRole('button', {name: 'Save'}).click();

        expect(lastApiRequests.editOffer?.body).toMatchObject({
            offers: [{
                id: responseFixtures.offers.offers![0].id,
                name: 'First offer',
                code: 'black-friday-offer'
            }]
        });
    });

    test('Renders preview for retention offers', async ({page}) => {
        await mockApi({page, requests: {
            browseOffers: {method: 'GET', path: '/offers/', response: responseFixtures.offers},
            ...globalDataRequests,
            browseConfig: {
                method: 'GET',
                path: '/config/',
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        labs: {
                            ...responseFixtures.config.config?.labs,
                            retentionOffers: true
                        }
                    }
                }
            },
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();

        const modal = page.getByTestId('offers-modal');
        await modal.getByRole('tab', {name: 'Retention'}).click();
        await modal.getByText('Monthly retention').click();

        const retentionModal = page.getByTestId('retention-offer-modal');
        await expect(retentionModal).toBeVisible();
        await retentionModal.getByLabel('Display title').fill('Before you go');
        await retentionModal.getByLabel('Display description').fill('Please stay <script>alert(1)</script>');
        await retentionModal.getByRole('button', {name: /Free month\(s\)/}).click();
        await retentionModal.getByLabel('Free months').fill('2');

        const iframe = retentionModal.getByTestId('portal-preview');
        const getPreviewParams = async () => {
            const src = await iframe.getAttribute('src');
            expect(src).toBeTruthy();

            const srcUrl = new URL(src!);
            const [,hashQuery = ''] = srcUrl.hash.split('?');
            return new URLSearchParams(hashQuery);
        };

        let params = await getPreviewParams();

        expect(decodeURIComponent(params.get('display_title') || '')).toBe('Before you go');
        expect(decodeURIComponent(params.get('display_description') || '')).toBe('Please stay <script>alert(1)</script>');
        expect(params.get('redemption_type')).toBe('retention');
        expect(params.get('type')).toBe('free_months');
        expect(params.get('amount')).toBe('2');
        expect(params.get('cadence')).toBe('month');
        expect(params.get('tier_id')).toBeTruthy();

        await retentionModal.getByLabel('Free months').fill('');

        params = await getPreviewParams();
        expect(params.get('type')).toBe('free_months');
        expect(params.get('amount')).toBe('2');

        await retentionModal.getByRole('button', {name: /Percentage discount/}).click();
        await retentionModal.getByLabel('Amount off').fill('35');

        params = await getPreviewParams();
        expect(params.get('type')).toBe('percent');
        expect(params.get('amount')).toBe('35');

        // Percent discount caps at 100%
        await retentionModal.getByLabel('Amount off').fill('150');

        params = await getPreviewParams();
        expect(params.get('type')).toBe('percent');
        expect(params.get('amount')).toBe('100');
    });

    test('Saves retention offer via create offer endpoint', async ({page}) => {
        const {lastApiRequests} = await mockApi({page, requests: {
            browseOffers: {method: 'GET', path: '/offers/', response: responseFixtures.offers},
            ...globalDataRequests,
            browseConfig: {
                method: 'GET',
                path: '/config/',
                response: {
                    config: {
                        ...responseFixtures.config.config,
                        labs: {
                            ...responseFixtures.config.config?.labs,
                            retentionOffers: true
                        }
                    }
                }
            },
            browseSettings: {...globalDataRequests.browseSettings, response: settingsWithStripe},
            browseTiers: {method: 'GET', path: '/tiers/', response: responseFixtures.tiers},
            addOffer: {method: 'POST', path: '/offers/', response: {
                offers: [{
                    id: 'retention-offer-monthly',
                    name: 'Monthly retention',
                    code: 'monthly-retention'
                }]
            }}
        }});

        await page.goto('/');
        const section = page.getByTestId('offers');
        await section.getByRole('button', {name: 'Manage offers'}).click();

        const modal = page.getByTestId('offers-modal');
        await modal.getByRole('tab', {name: 'Retention'}).click();
        await modal.getByText('Monthly retention').click();

        const retentionModal = page.getByTestId('retention-offer-modal');
        await expect(retentionModal).toBeVisible();
        await retentionModal.getByLabel('Display title').fill('Before you go');
        await retentionModal.getByLabel('Display description').fill('Stay for a little longer');
        await retentionModal.getByRole('button', {name: /Percentage discount/}).click();
        await retentionModal.getByLabel('Amount off').fill('35');

        await retentionModal.getByRole('button', {name: 'Save'}).click();

        await expect.poll(() => lastApiRequests.addOffer?.body).toBeTruthy();
        expect(lastApiRequests.addOffer?.body).toMatchObject({
            offers: [{
                name: 'Monthly retention',
                code: 'monthly-retention',
                display_title: 'Before you go',
                display_description: 'Stay for a little longer',
                cadence: 'month',
                amount: 35,
                duration: 'once',
                duration_in_months: 0,
                currency: null,
                status: 'active',
                redemption_type: 'retention',
                tier: null,
                type: 'percent',
                currency_restriction: false
            }]
        });
    });
});
