import {type Page, expect, test} from '@playwright/test';
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

    test.describe('Retention offers', () => {
        type MockRequest = {
            method: string;
            path: string | RegExp;
            response: unknown;
            responseStatus?: number;
            responseHeaders?: {[key: string]: string};
        };

        type RetentionOffer = {
            id: string;
            name: string;
            code: string;
            display_title: string;
            display_description: string;
            type: 'percent';
            cadence: 'month' | 'year';
            amount: number;
            duration: 'forever' | 'once' | 'repeating';
            duration_in_months: number | null;
            currency_restriction: boolean;
            currency: string | null;
            status: 'active' | 'archived';
            redemption_count: number;
            redemption_type: 'retention';
            tier: null;
            created_at?: string;
            last_redeemed?: string;
        };

        const signupOffers = (responseFixtures.offers.offers || []).filter(offer => offer.redemption_type === 'signup');
        const defaultRetentionOffer: RetentionOffer = {
            id: 'retention-offer',
            name: 'Monthly retention',
            code: 'monthly-retention',
            display_title: '',
            display_description: '',
            type: 'percent',
            cadence: 'month',
            amount: 20,
            duration: 'forever',
            duration_in_months: null,
            currency_restriction: false,
            currency: null,
            status: 'active',
            redemption_count: 0,
            redemption_type: 'retention',
            tier: null
        };

        const createRetentionOffer = (overrides: Partial<RetentionOffer> = {}) => {
            return {
                ...defaultRetentionOffer,
                ...overrides
            };
        };

        const getRetentionRequests = <ExtraRequests extends Record<string, MockRequest> = Record<string, never>>({
            retentionOffers,
            extraRequests = {} as ExtraRequests
        }: {
            retentionOffers: Array<ReturnType<typeof createRetentionOffer>>;
            extraRequests?: ExtraRequests;
        }) => {
            return {
                browseOffers: {
                    method: 'GET',
                    path: '/offers/',
                    response: {
                        offers: [...signupOffers, ...retentionOffers]
                    }
                },
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
                ...extraRequests
            };
        };

        const openOffersModal = async (page: Page) => {
            await page.goto('/');
            const section = page.getByTestId('offers');
            await section.getByRole('button', {name: 'Manage offers'}).click();

            const modal = page.getByTestId('offers-modal');
            return modal;
        };

        const openRetentionModal = async (page: Page, name: 'Monthly retention' | 'Yearly retention') => {
            const modal = await openOffersModal(page);
            await modal.getByText(name).click();
            const retentionModal = page.getByTestId('retention-offer-modal');
            await expect(retentionModal).toBeVisible();
            return {modal, retentionModal};
        };

        const formatOfferDateForBrowser = async (page: Page, timestamp: string) => {
            return await page.evaluate((value) => {
                return new Date(value).toLocaleDateString('default', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit'
                });
            }, timestamp);
        };

        test('Lists monthly and yearly retention offers', async ({page}) => {
            await mockApi({page, requests: getRetentionRequests({
                retentionOffers: [
                    createRetentionOffer({
                        id: 'retention-month-active',
                        name: 'Monthly retention active',
                        code: 'monthly-retention-active',
                        display_title: 'Before you go',
                        amount: 25,
                        duration: 'once',
                        redemption_count: 7
                    }),
                    createRetentionOffer({
                        id: 'retention-year-archived',
                        name: 'Yearly retention archived',
                        code: 'yearly-retention-archived',
                        display_title: 'Stay with us',
                        type: 'percent',
                        cadence: 'year',
                        amount: 100,
                        duration: 'repeating',
                        duration_in_months: 2,
                        status: 'archived',
                        redemption_count: 9
                    }),
                    createRetentionOffer({
                        id: 'retention-month-archived',
                        name: 'Monthly retention archived',
                        code: 'monthly-retention-archived',
                        amount: 30,
                        status: 'archived',
                        redemption_count: 3
                    })
                ]
            })});

            const modal = await openOffersModal(page);
            const rows = modal.getByTestId('retention-offer-item');
            await expect(rows).toHaveCount(2);

            const monthlyRow = rows.nth(0);
            await expect(monthlyRow).toContainText('Monthly retention');
            await expect(monthlyRow).toContainText('25% OFF');
            await expect(monthlyRow).toContainText('First payment');
            await expect(monthlyRow).toContainText('10');
            await expect(monthlyRow).toContainText('Active');
            await expect(monthlyRow.getByTestId('retention-redemptions-link-monthly')).toHaveAttribute('href', '/ghost/#/members?filter=offer_redemptions%3A%5Bretention-month-active%2Cretention-month-archived%5D');

            const yearlyRow = rows.nth(1);
            await expect(yearlyRow).toContainText('Yearly retention');
            await expect(yearlyRow).toContainText('Inactive');
            await expect(yearlyRow).toContainText('9');
            await expect(yearlyRow.getByTestId('retention-redemptions-link-yearly')).toHaveAttribute('href', '/ghost/#/members?filter=offer_redemptions%3A%5Bretention-year-archived%5D');
            await expect(yearlyRow).not.toContainText('2 MONTHS FREE');
        });

        test('Renders existing retention offers in edit mode', async ({page}) => {
            await mockApi({page, requests: getRetentionRequests({
                retentionOffers: [
                    createRetentionOffer({
                        id: 'retention-month-active',
                        name: 'Monthly retention active',
                        code: 'monthly-retention-active',
                        display_title: 'Stay monthly',
                        display_description: 'Monthly description',
                        amount: 100,
                        duration: 'repeating',
                        duration_in_months: 2,
                        redemption_count: 7,
                        created_at: '2026-02-17T12:00:00.000Z',
                        last_redeemed: '2026-02-18T12:00:00.000Z'
                    }),
                    createRetentionOffer({
                        id: 'retention-year-active',
                        name: 'Yearly retention active',
                        code: 'yearly-retention-active',
                        display_title: 'Stay yearly',
                        display_description: 'Yearly description',
                        type: 'percent',
                        cadence: 'year',
                        amount: 30,
                        duration: 'once',
                        redemption_count: 4,
                        created_at: '2026-02-16T12:00:00.000Z',
                        last_redeemed: '2026-02-17T12:00:00.000Z'
                    }),
                    createRetentionOffer({
                        id: 'retention-month-archived',
                        name: 'Monthly retention archived',
                        code: 'monthly-retention-archived',
                        display_title: 'Older monthly retention',
                        amount: 30,
                        duration: 'once',
                        status: 'archived',
                        redemption_count: 4,
                        created_at: '2026-01-19T12:00:00.000Z',
                        last_redeemed: '2026-02-19T12:00:00.000Z'
                    }),
                    createRetentionOffer({
                        id: 'retention-year-archived',
                        name: 'Yearly retention archived',
                        code: 'yearly-retention-archived',
                        display_title: 'Older yearly retention',
                        type: 'percent',
                        cadence: 'year',
                        amount: 100,
                        duration: 'repeating',
                        duration_in_months: 1,
                        status: 'archived',
                        redemption_count: 5,
                        created_at: '2026-01-25T12:00:00.000Z',
                        last_redeemed: '2026-02-18T12:00:00.000Z'
                    })
                ]
            })});

            const {modal, retentionModal: monthlyModal} = await openRetentionModal(page, 'Monthly retention');
            const expectedMonthlyLastRedemption = await formatOfferDateForBrowser(page, '2026-02-19T12:00:00.000Z');
            await expect(monthlyModal).toContainText('11 redemptions');
            await expect(monthlyModal).toContainText('Last redemption');
            await expect(monthlyModal).toContainText(expectedMonthlyLastRedemption);
            await expect(monthlyModal.getByRole('link', {name: 'See members →'})).toHaveAttribute('href', /offer_redemptions%3A%5Bretention-month-active%2Cretention-month-archived%5D/);
            await expect(monthlyModal.getByLabel('Enable monthly retention')).toBeChecked();
            await expect(monthlyModal.getByLabel('Display title')).toHaveValue('Stay monthly');
            await expect(monthlyModal.getByLabel('Display description')).toHaveValue('Monthly description');
            await expect(monthlyModal.getByLabel('Free months')).toHaveValue('2');

            await monthlyModal.getByRole('button', {name: 'Cancel'}).click();
            await modal.getByText('Yearly retention').click();

            const yearlyModal = page.getByTestId('retention-offer-modal');
            const expectedYearlyLastRedemption = await formatOfferDateForBrowser(page, '2026-02-18T12:00:00.000Z');
            await expect(yearlyModal).toBeVisible();
            await expect(yearlyModal).toContainText('9 redemptions');
            await expect(yearlyModal).toContainText('Last redemption');
            await expect(yearlyModal).toContainText(expectedYearlyLastRedemption);
            await expect(yearlyModal.getByRole('link', {name: 'See members →'})).toHaveAttribute('href', /offer_redemptions%3A%5Bretention-year-active%2Cretention-year-archived%5D/);
            await expect(yearlyModal.getByLabel('Enable yearly retention')).toBeChecked();
            await expect(yearlyModal.getByLabel('Display title')).toHaveValue('Stay yearly');
            await expect(yearlyModal.getByLabel('Display description')).toHaveValue('Yearly description');
            await expect(yearlyModal.getByLabel('Amount off')).toHaveValue('30');
        });

        test('Shows validation errors for invalid retention values on save', async ({page}) => {
            await mockApi({page, requests: getRetentionRequests({
                retentionOffers: [createRetentionOffer({id: 'retention-month-active'})]
            })});

            const {retentionModal} = await openRetentionModal(page, 'Monthly retention');
            const saveButton = retentionModal.getByRole('button', {name: /Save|Retry/});
            await expect(saveButton).toBeEnabled();

            await retentionModal.getByLabel('Amount off').fill('0');
            await saveButton.click();
            await expect(retentionModal.getByText('Enter an amount between 1 and 100%.')).toBeVisible();
            await expect(saveButton).toBeEnabled();

            await retentionModal.getByLabel('Amount off').fill('150');
            await saveButton.click();
            await expect(retentionModal.getByText('Enter an amount between 1 and 100%.')).toBeVisible();
            await expect(saveButton).toBeEnabled();
        });

        test('Shows save error toast when retention save fails', async ({page}) => {
            await mockApi({page, requests: getRetentionRequests({
                retentionOffers: [createRetentionOffer({id: 'retention-month-active'})],
                extraRequests: {
                    addOffer: {method: 'POST', path: '/offers/', responseStatus: 400, responseHeaders: {'content-type': 'json'}, response: {
                        errors: [{
                            message: 'Validation error, cannot create offer.',
                            context: 'Offer `code` must be unique. Please change and try again.'
                        }]
                    }}
                }
            })});

            const {retentionModal} = await openRetentionModal(page, 'Monthly retention');
            await retentionModal.getByLabel('Amount off').fill('35');
            await retentionModal.getByRole('button', {name: 'Save'}).click();

            await expect(page.getByTestId('toast-error')).toContainText(/Offer `code` must be unique. Please change and try again./);
        });

        test('Hides repeating duration option for yearly retention offers', async ({page}) => {
            await mockApi({page, requests: getRetentionRequests({
                retentionOffers: [
                    createRetentionOffer({
                        id: 'retention-year-active',
                        name: 'Yearly retention',
                        code: 'yearly-retention',
                        display_title: 'Stay yearly',
                        cadence: 'year',
                        duration: 'once'
                    })
                ]
            })});

            const {retentionModal} = await openRetentionModal(page, 'Yearly retention');
            const sidebarScrollContainer = retentionModal.locator('div.overflow-y-auto').first();
            await sidebarScrollContainer.evaluate((element) => {
                element.scrollTop = element.scrollHeight;
            });

            const durationSelectTrigger = retentionModal.getByText('First-payment', {exact: true}).first();
            await durationSelectTrigger.click();
            const durationOptions = await page.locator('[data-testid="select-option"]').allTextContents();
            expect(durationOptions).toContain('First-payment');
            expect(durationOptions).toContain('Forever');
            expect(durationOptions).not.toContain('Multiple-months');
            await page.keyboard.press('Escape');
        });

        test('Renders preview for retention offers', async ({page}) => {
            await mockApi({page, requests: getRetentionRequests({
                retentionOffers: [createRetentionOffer({id: 'retention-month-active'})]
            })});

            const {retentionModal} = await openRetentionModal(page, 'Monthly retention');
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
            expect(params.get('type')).toBe('percent');
            expect(params.get('amount')).toBe('100');
            expect(params.get('duration')).toBe('repeating');
            expect(params.get('duration_in_months')).toBe('2');
            expect(params.get('cadence')).toBe('month');
            expect(params.get('tier_id')).toBeTruthy();

            await retentionModal.getByLabel('Free months').fill('');
            params = await getPreviewParams();
            expect(params.get('type')).toBe('percent');
            expect(params.get('amount')).toBe('100');
            expect(params.get('duration_in_months')).toBe('2');

            await retentionModal.getByRole('button', {name: /Percentage discount/}).click();
            await retentionModal.getByLabel('Amount off').fill('35');
            params = await getPreviewParams();
            expect(params.get('type')).toBe('percent');
            expect(params.get('amount')).toBe('35');
        });

        test('Creates a new retention offer when terms change', async ({page}) => {
            const {lastApiRequests} = await mockApi({page, requests: getRetentionRequests({
                retentionOffers: [createRetentionOffer({id: 'retention-month-active'})],
                extraRequests: {
                    addOffer: {method: 'POST', path: '/offers/', response: {
                        offers: [{
                            id: 'retention-offer-monthly',
                            name: 'Monthly retention',
                            code: 'monthly-retention'
                        }]
                    }}
                }
            })});

            const {retentionModal} = await openRetentionModal(page, 'Monthly retention');
            await retentionModal.getByLabel('Display title').fill('Before you go');
            await retentionModal.getByLabel('Display description').fill('Stay for a little longer');
            await retentionModal.getByRole('button', {name: /Percentage discount/}).click();
            await retentionModal.getByLabel('Amount off').fill('35');
            await retentionModal.getByRole('button', {name: 'Save'}).click();

            await expect.poll(() => lastApiRequests.addOffer?.body).toBeTruthy();
            expect(lastApiRequests.addOffer?.body).toMatchObject({
                offers: [{
                    display_title: 'Before you go',
                    display_description: 'Stay for a little longer',
                    cadence: 'month',
                    amount: 35,
                    duration: 'forever',
                    duration_in_months: 0,
                    currency: null,
                    status: 'active',
                    redemption_type: 'retention',
                    tier: null,
                    type: 'percent',
                    currency_restriction: false
                }]
            });

            const createdOffer = (lastApiRequests.addOffer?.body as {offers: Array<{name: string; code: string}>})?.offers?.[0];
            expect(createdOffer?.name).toMatch(/^Retention 35% off forever \([a-f0-9]{4}\)$/);
            expect(createdOffer?.code).toMatch(/^[a-f0-9]{4}$/);
        });

        test('Edits existing retention offer when only display fields change', async ({page}) => {
            const {lastApiRequests} = await mockApi({page, requests: getRetentionRequests({
                retentionOffers: [
                    createRetentionOffer({
                        id: 'retention-month-active',
                        display_title: 'Old title',
                        display_description: 'Old description'
                    })
                ],
                extraRequests: {
                    addOffer: {method: 'POST', path: '/offers/', response: {offers: []}},
                    editOffer: {method: 'PUT', path: '/offers/retention-month-active/', response: {
                        offers: [{
                            id: 'retention-month-active',
                            name: 'Monthly retention',
                            code: 'monthly-retention'
                        }]
                    }}
                }
            })});

            const {retentionModal} = await openRetentionModal(page, 'Monthly retention');
            await retentionModal.getByLabel('Display title').fill('New title');
            await retentionModal.getByLabel('Display description').fill('New description');
            await retentionModal.getByRole('button', {name: 'Save'}).click();

            await expect.poll(() => lastApiRequests.editOffer?.body).toBeTruthy();
            expect(lastApiRequests.editOffer?.body).toMatchObject({
                offers: [{
                    id: 'retention-month-active',
                    display_title: 'New title',
                    display_description: 'New description',
                    status: 'active'
                }]
            });
            expect(lastApiRequests.addOffer).toBeUndefined();
        });

        test('Creates archived retention draft and archives active offer when disabled', async ({page}) => {
            const {lastApiRequests} = await mockApi({page, requests: getRetentionRequests({
                retentionOffers: [createRetentionOffer({
                    id: 'retention-month-active',
                    display_title: 'Before you go'
                })],
                extraRequests: {
                    addOffer: {method: 'POST', path: '/offers/', response: {
                        offers: [{
                            id: 'retention-offer-monthly-archived',
                            name: 'Monthly retention',
                            code: 'monthly-retention'
                        }]
                    }},
                    editOffer: {method: 'PUT', path: '/offers/retention-month-active/', response: {
                        offers: [{
                            id: 'retention-month-active',
                            status: 'archived'
                        }]
                    }}
                }
            })});

            const {retentionModal} = await openRetentionModal(page, 'Monthly retention');
            await retentionModal.getByLabel('Amount off').fill('35');
            await retentionModal.getByRole('switch', {name: 'Enable monthly retention'}).click();
            await retentionModal.getByRole('button', {name: 'Save'}).click();

            await expect.poll(() => lastApiRequests.editOffer?.body).toBeTruthy();
            await expect.poll(() => lastApiRequests.addOffer?.body).toBeTruthy();

            expect(lastApiRequests.editOffer?.body).toMatchObject({
                offers: [{
                    id: 'retention-month-active',
                    status: 'archived'
                }]
            });

            expect(lastApiRequests.addOffer?.body).toMatchObject({
                offers: [{
                    cadence: 'month',
                    amount: 35,
                    duration: 'forever',
                    duration_in_months: 0,
                    status: 'archived',
                    redemption_type: 'retention',
                    tier: null,
                    type: 'percent',
                    currency_restriction: false
                }]
            });
        });
    });
});
