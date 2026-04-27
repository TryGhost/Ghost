import {render} from '../../../../utils/test-utils';
import PaidAccountActions from '../../../../../src/components/pages/AccountHomePage/components/paid-account-actions';
import {getDiscountData, getMemberData, getNextPaymentData, getSubscriptionData, getSiteData, getProductsData, getProductData} from '../../../../../src/utils/fixtures-generator';

const setup = (overrides) => {
    const {mockDoActionFn, ...utils} = render(
        <PaidAccountActions />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );
    return {
        mockDoActionFn,
        ...utils
    };
};

describe('PaidAccountActions', () => {
    describe('Plan label', () => {
        test('displays regular price when no discount on next payment', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});
            const member = getMemberData({
                paid: true,
                status: 'comped',
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 500,
                        currency: 'USD',
                        interval: 'month',
                        offer: null,
                        nextPayment: getNextPaymentData({
                            originalAmount: 500,
                            amount: 500,
                            interval: 'month',
                            currency: 'USD',
                            discount: null
                        })
                    })
                ]
            });

            const {queryByText, queryByTestId} = setup({site, member});

            // Should show the regular price
            expect(queryByText('$5.00/month')).toBeInTheDocument();
            // Should not show any offer label
            expect(queryByTestId('offer-label')).not.toBeInTheDocument();
        });

        test('displays "Free Trial" for trial subscriptions', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});

            const trialEndAt = new Date('2099-01-01T12:00:00.000Z');

            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'trialing',
                        amount: 500,
                        currency: 'USD',
                        interval: 'month',
                        offer: null,
                        trialEndAt: trialEndAt,
                        nextPayment: getNextPaymentData({
                            originalAmount: 500,
                            amount: 500,
                            interval: 'month',
                            currency: 'USD',
                            discount: null
                        })
                    })
                ]
            });

            const {queryByText} = setup({site, member});

            // Should show the regular price with strikethrough class
            expect(queryByText('$5.00/month')).toBeInTheDocument();
            // Should show "Free trial - Ends {date}"
            expect(queryByText(/Free Trial/)).toBeInTheDocument();
            expect(queryByText(/Ends/)).toBeInTheDocument();
            expect(queryByText(/1 Jan 2099/)).toBeInTheDocument();
        });

        test('displays "Free Trial" for trial offers', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});

            const trialEndAt = new Date('2099-01-01T12:00:00.000Z');

            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'trialing',
                        amount: 500,
                        currency: 'USD',
                        interval: 'month',
                        offer: {
                            type: 'trial',
                            amount: 7,
                            duration: 'trial'
                        },
                        trialEndAt: trialEndAt,
                        nextPayment: getNextPaymentData({
                            originalAmount: 500,
                            amount: 500,
                            interval: 'month',
                            currency: 'USD',
                            discount: null
                        })
                    })
                ]
            });

            const {queryByText} = setup({site, member});

            expect(queryByText(/Free Trial/)).toBeInTheDocument();
            expect(queryByText(/Ends/)).toBeInTheDocument();
            expect(queryByText(/1 Jan 2099/)).toBeInTheDocument();
        });

        test('displays "Complimentary" with expiry date', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});

            const expiryAt = new Date('2099-01-01T12:00:00.000Z');

            const member = getMemberData({
                paid: true,
                status: 'comped',
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 0,
                        currency: 'USD',
                        interval: 'month',
                        offer: null,
                        tier: {
                            expiry_at: expiryAt
                        },
                        nextPayment: getNextPaymentData({
                            originalAmount: 0,
                            amount: 0,
                            interval: 'month',
                            currency: 'USD',
                            discount: null
                        })
                    })
                ]
            });

            const {queryByText} = setup({site, member});

            // Should show "Complimentary - Expires {date}"
            expect(queryByText(/Complimentary/)).toBeInTheDocument();
            expect(queryByText(/Expires/)).toBeInTheDocument();
            expect(queryByText(/1 Jan 2099/)).toBeInTheDocument();
        });

        test('displays "Complimentary" without expiry for permanent comp', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});

            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 0,
                        currency: 'USD',
                        interval: 'month',
                        offer: null,
                        tier: null,
                        nextPayment: getNextPaymentData({
                            originalAmount: 0,
                            amount: 0,
                            interval: 'month',
                            currency: 'USD',
                            discount: null
                        })
                    })
                ]
            });

            const {queryByText} = setup({site, member});

            // Should show "Complimentary" without expiry
            expect(queryByText(/Complimentary/)).toBeInTheDocument();
            expect(queryByText(/Expires/)).not.toBeInTheDocument();
        });

        test('displays "Gift subscription" with expiry date', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});

            const expiryAt = new Date('2099-01-01T12:00:00.000Z');

            const member = getMemberData({
                paid: true,
                status: 'gift',
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 0,
                        currency: 'USD',
                        interval: 'month',
                        offer: null,
                        tier: {
                            expiry_at: expiryAt
                        },
                        nextPayment: getNextPaymentData({
                            originalAmount: 0,
                            amount: 0,
                            interval: 'month',
                            currency: 'USD',
                            discount: null
                        })
                    })
                ]
            });

            const {queryByText} = setup({site, member});

            expect(queryByText(/Gift subscription/)).toBeInTheDocument();
            expect(queryByText(/Expires/)).toBeInTheDocument();
            expect(queryByText(/1 Jan 2099/)).toBeInTheDocument();
        });

        test('displays discounted price with "Forever" for forever offers', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});

            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 500,
                        currency: 'USD',
                        interval: 'month',
                        offer: {
                            type: 'percent',
                            amount: 20,
                            duration: 'forever'
                        },
                        nextPayment: getNextPaymentData({
                            originalAmount: 500,
                            amount: 400,
                            interval: 'month',
                            currency: 'USD',
                            discount: getDiscountData({
                                duration: 'forever',
                                type: 'percent',
                                amount: 20,
                                end: null
                            })
                        })
                    })
                ]
            });

            const {queryByText, queryByTestId} = setup({site, member});

            // Should show the original price with strikethrough
            expect(queryByText('$5.00/month')).toBeInTheDocument();
            // Should have the offer label
            expect(queryByTestId('offer-label')).toBeInTheDocument();
            // Should show the discounted price with Forever label
            expect(queryByText('$4.00/month — Forever')).toBeInTheDocument();
        });

        test('displays discounted price with "Ends {date}" for repeating offers', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});

            const currentPeriodEnd = new Date('2099-04-03T12:00:00.000Z');
            const discountEnd = new Date('2099-05-03T12:00:00.000Z');

            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 500,
                        currency: 'USD',
                        interval: 'month',
                        offer: {
                            type: 'percent',
                            amount: 20,
                            duration: 'repeating',
                            duration_in_months: 2
                        },
                        currentPeriodEnd: currentPeriodEnd.toISOString(),
                        nextPayment: getNextPaymentData({
                            originalAmount: 500,
                            amount: 400,
                            interval: 'month',
                            currency: 'USD',
                            discount: getDiscountData({
                                duration: 'repeating',
                                durationInMonths: 2,
                                type: 'percent',
                                amount: 20,
                                end: discountEnd.toISOString()
                            })
                        })
                    })
                ]
            });

            const {queryByText, queryByTestId} = setup({site, member});

            // Should show the original price (with strikethrough)
            expect(queryByText('$5.00/month')).toBeInTheDocument();
            // Should have the offer label
            expect(queryByTestId('offer-label')).toBeInTheDocument();
            // Should show the discounted price with end date
            expect(queryByText(/\$4\.00\/month/)).toBeInTheDocument();
            expect(queryByText(/Ends/)).toBeInTheDocument();
            expect(queryByText('$4.00/month — Ends 3 May 2099')).toBeInTheDocument();
        });

        test('displays $0.00/month - Ends {date} for free months offers', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});

            const discountEnd = new Date('2099-01-03T12:00:00.000Z');
            const currentPeriodEnd = new Date('2099-01-03T12:00:00.000Z');

            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 500,
                        currency: 'USD',
                        interval: 'month',
                        offer: {
                            type: 'percent',
                            amount: 100,
                            duration: 'repeating',
                            duration_in_months: 1,
                            redemption_type: 'retention'
                        },
                        currentPeriodEnd: currentPeriodEnd.toISOString(),
                        nextPayment: getNextPaymentData({
                            originalAmount: 500,
                            amount: 0,
                            interval: 'month',
                            currency: 'USD',
                            discount: getDiscountData({
                                duration: 'repeating',
                                durationInMonths: 1,
                                type: 'percent',
                                amount: 100,
                                end: discountEnd.toISOString()
                            })
                        })
                    })
                ]
            });

            const {queryByText, queryByTestId} = setup({site, member});

            expect(queryByText('$5.00/month')).toBeInTheDocument();
            expect(queryByText('$5.00/month')).toHaveClass('gh-portal-account-old-price');
            expect(queryByTestId('offer-label')).toBeInTheDocument();
            expect(queryByText('$0.00/month — Ends 3 Jan 2099')).toBeInTheDocument();
        });

        test('displays discounted price with "Ends {date}" for once offers', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});
            const discountEnd = new Date('2099-03-01T12:00:00.000Z');

            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 500,
                        currency: 'USD',
                        interval: 'month',
                        offer: {
                            type: 'percent',
                            amount: 20,
                            duration: 'once'
                        },
                        nextPayment: getNextPaymentData({
                            originalAmount: 500,
                            amount: 400,
                            interval: 'month',
                            currency: 'USD',
                            discount: getDiscountData({
                                duration: 'once',
                                type: 'percent',
                                amount: 20,
                                end: discountEnd.toISOString()
                            })
                        })
                    })
                ]
            });

            const {queryByText, queryByTestId} = setup({site, member});

            // Should show the original price (with strikethrough)
            expect(queryByText('$5.00/month')).toBeInTheDocument();
            // Should have the offer label
            expect(queryByTestId('offer-label')).toBeInTheDocument();
            // Should show the discounted price with end date from next_payment.discount.end
            expect(queryByText('$4.00/month — Ends 1 Mar 2099')).toBeInTheDocument();
        });

        test('displays fixed amount discount correctly', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});

            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 1000,
                        currency: 'USD',
                        interval: 'month',
                        offer: {
                            type: 'fixed',
                            amount: 300,
                            duration: 'forever',
                            currency: 'USD'
                        },
                        nextPayment: getNextPaymentData({
                            originalAmount: 1000,
                            amount: 700,
                            interval: 'month',
                            currency: 'USD',
                            discount: getDiscountData({
                                duration: 'forever',
                                type: 'fixed',
                                amount: 300,
                                end: null
                            })
                        })
                    })
                ]
            });

            const {queryByText, queryByTestId} = setup({site, member});

            // Should show the original price
            expect(queryByText('$10.00/month')).toBeInTheDocument();
            // Should have the offer label
            expect(queryByTestId('offer-label')).toBeInTheDocument();
            // Should show the discounted price
            expect(queryByText('$7.00/month — Forever')).toBeInTheDocument();
        });

        test('displays yearly subscription with discount correctly', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});

            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 5000,
                        currency: 'USD',
                        interval: 'year',
                        offer: {
                            type: 'percent',
                            amount: 10,
                            duration: 'forever'
                        },
                        nextPayment: getNextPaymentData({
                            originalAmount: 5000,
                            amount: 4500,
                            interval: 'year',
                            currency: 'USD',
                            discount: getDiscountData({
                                duration: 'forever',
                                type: 'percent',
                                amount: 10,
                                end: null
                            })
                        })
                    })
                ]
            });

            const {queryByText, queryByTestId} = setup({site, member});

            // Should show the original yearly price
            expect(queryByText('$50.00/year')).toBeInTheDocument();
            // Should have the offer label
            expect(queryByTestId('offer-label')).toBeInTheDocument();
            // Should show the discounted yearly price
            expect(queryByText('$45.00/year — Forever')).toBeInTheDocument();
        });
    });

    describe('PlanUpdateButton', () => {
        const buildPaidSite = () => {
            const products = getProductsData({numOfProducts: 1});
            return {
                site: getSiteData({products, portalProducts: products.map(p => p.id)}),
                products
            };
        };

        const buildFreeOnlySite = () => {
            const products = getProductsData({numOfProducts: 1});
            return getSiteData({
                products,
                portalProducts: products.map(p => p.id),
                portalPlans: ['free']
            });
        };

        const buildGiftMember = ({tierId}) => getMemberData({
            paid: true,
            status: 'gift',
            subscriptions: [
                getSubscriptionData({
                    status: 'active',
                    amount: 0,
                    currency: 'USD',
                    interval: 'month',
                    tier: {id: tierId, expiry_at: new Date('2099-01-01T12:00:00.000Z')}
                })
            ]
        });

        test('renders "Continue" for a gift member whose tier is still active', () => {
            const {site, products} = buildPaidSite();
            const member = buildGiftMember({tierId: products[0].id});

            const {container} = setup({site, member});

            expect(container.querySelector('[data-test-button="continue-gift-subscription"]')).toBeInTheDocument();
            expect(container.querySelector('[data-test-button="change-plan"]')).not.toBeInTheDocument();
        });

        test('renders "Change" for a gift member when the tier has been archived', () => {
            // Archived tier = tier id absent from site.products
            const {site} = buildPaidSite();
            const archivedTier = getProductData({name: 'Archived'});
            const member = buildGiftMember({tierId: archivedTier.id});

            const {container} = setup({site, member});

            expect(container.querySelector('[data-test-button="change-plan"]')).toBeInTheDocument();
            expect(container.querySelector('[data-test-button="continue-gift-subscription"]')).not.toBeInTheDocument();
        });

        test('renders nothing for a gift on an archived tier when no paid plans are available', () => {
            const site = buildFreeOnlySite();
            const archivedTier = getProductData({name: 'Archived'});
            const member = buildGiftMember({tierId: archivedTier.id});

            const {container} = setup({site, member});

            expect(container.querySelector('[data-test-button="continue-gift-subscription"]')).not.toBeInTheDocument();
            expect(container.querySelector('[data-test-button="change-plan"]')).not.toBeInTheDocument();
        });

        test('renders "Change" for a regular paid member when paid plans are available', () => {
            const {site} = buildPaidSite();
            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 500,
                        currency: 'USD',
                        interval: 'month'
                    })
                ]
            });

            const {container} = setup({site, member});

            expect(container.querySelector('[data-test-button="change-plan"]')).toBeInTheDocument();
        });

        test('still renders "Change" for a regular paid member on a free-only site', () => {
            // Paid members keep the Change button even when no paid plans are
            // exposed in Portal — the upgrade page is the only place they can
            // see the contact-publisher message.
            const site = buildFreeOnlySite();
            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 500,
                        currency: 'USD',
                        interval: 'month'
                    })
                ]
            });

            const {container} = setup({site, member});

            expect(container.querySelector('[data-test-button="change-plan"]')).toBeInTheDocument();
        });

        test('renders "Change" for a comped member when paid plans are available', () => {
            const {site} = buildPaidSite();
            const member = getMemberData({
                paid: true,
                status: 'comped',
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 0,
                        currency: 'USD',
                        interval: 'month'
                    })
                ]
            });

            const {container} = setup({site, member});

            expect(container.querySelector('[data-test-button="change-plan"]')).toBeInTheDocument();
            expect(container.querySelector('[data-test-button="continue-gift-subscription"]')).not.toBeInTheDocument();
        });

        test('still renders "Change" for a comped member on a free-only site', () => {
            // Comped members keep the Change button so they can reach the
            // upgrade page and see the contact-publisher message.
            const site = buildFreeOnlySite();
            const member = getMemberData({
                paid: true,
                status: 'comped',
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        amount: 0,
                        currency: 'USD',
                        interval: 'month'
                    })
                ]
            });

            const {container} = setup({site, member});

            expect(container.querySelector('[data-test-button="change-plan"]')).toBeInTheDocument();
        });

        test('renders nothing for a free member', () => {
            // Free members have no subscription and aren't complimentary, so
            // PaidAccountActions short-circuits before PlanUpdateButton is reached.
            const {site} = buildPaidSite();
            const member = getMemberData({
                paid: false,
                status: 'free',
                subscriptions: []
            });

            const {container} = setup({site, member});

            expect(container.querySelector('[data-test-button="change-plan"]')).not.toBeInTheDocument();
            expect(container.querySelector('[data-test-button="continue-gift-subscription"]')).not.toBeInTheDocument();
            expect(container.querySelector('[data-test-button="manage-billing"]')).not.toBeInTheDocument();
        });
    });

    describe('Canceled badge', () => {
        test('displays CANCELED badge when cancel_at_period_end is true', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});
            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        cancelAtPeriodEnd: true,
                        amount: 500,
                        currency: 'USD',
                        interval: 'month',
                        nextPayment: getNextPaymentData({
                            originalAmount: 500,
                            amount: 500,
                            interval: 'month',
                            currency: 'USD',
                            discount: null
                        })
                    })
                ]
            });

            const {queryByText} = setup({site, member});
            expect(queryByText('Canceled')).toBeInTheDocument();
        });

        test('does not display CANCELED badge when subscription is active', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});
            const member = getMemberData({
                paid: true,
                subscriptions: [
                    getSubscriptionData({
                        status: 'active',
                        cancelAtPeriodEnd: false,
                        amount: 500,
                        currency: 'USD',
                        interval: 'month',
                        nextPayment: getNextPaymentData({
                            originalAmount: 500,
                            amount: 500,
                            interval: 'month',
                            currency: 'USD',
                            discount: null
                        })
                    })
                ]
            });

            const {queryByText} = setup({site, member});
            expect(queryByText('Canceled')).not.toBeInTheDocument();
        });
    });
});
