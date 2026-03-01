import {render} from '../../../../utils/test-utils';
import PaidAccountActions from '../../../../../src/components/pages/AccountHomePage/components/paid-account-actions';
import {getDiscountData, getMemberData, getNextPaymentData, getSubscriptionData, getSiteData, getProductsData} from '../../../../../src/utils/fixtures-generator';

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

        test('displays "{x} month(s) free" for free months (percent/100/repeating) offers', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});

            const discountEnd = new Date('2099-02-01T12:00:00.000Z');

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
                        nextPayment: getNextPaymentData({
                            originalAmount: 500,
                            amount: 500,
                            interval: 'month',
                            currency: 'USD',
                            discount: getDiscountData({
                                duration: 'repeating',
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
            expect(queryByTestId('offer-label')).toBeInTheDocument();
            expect(queryByText(/1 month free/)).toBeInTheDocument();
        });

        test('displays "Complimentary" with expiry date', () => {
            const products = getProductsData({numOfProducts: 1});
            const site = getSiteData({products, portalProducts: products.map(p => p.id)});

            const expiryAt = new Date('2099-01-01T12:00:00.000Z');

            const member = getMemberData({
                paid: true,
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

            const endDate = new Date('2099-01-01T12:00:00.000Z');

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
                            duration_in_months: 6
                        },
                        nextPayment: getNextPaymentData({
                            originalAmount: 500,
                            amount: 400,
                            interval: 'month',
                            currency: 'USD',
                            discount: getDiscountData({
                                duration: 'repeating',
                                type: 'percent',
                                amount: 20,
                                end: endDate.toISOString()
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
            expect(queryByText(/1 Jan 2099/)).toBeInTheDocument();
        });

        test('displays "Next payment" for once duration offers', () => {
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
                                end: null
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
            // Should show the discounted price (without interval) with "Next payment"
            expect(queryByText('$4.00 — Next payment')).toBeInTheDocument();
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
});
