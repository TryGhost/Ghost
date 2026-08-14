import {render} from '../../../../utils/test-utils';
import ContinueSubscriptionButton from '../../../../../src/components/pages/AccountHomePage/components/continue-subscription-button';
import {getMemberData, getSubscriptionData, getSiteData, getProductsData, getNextPaymentData} from '../../../../../src/utils/fixtures-generator';

const setup = (overrides) => {
    const {mockDoActionFn, ...utils} = render(
        <ContinueSubscriptionButton />,
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

describe('ContinueSubscriptionButton', () => {
    test('renders nothing when cancel_at_period_end is false', () => {
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

        const {container} = setup({site, member});
        expect(container.innerHTML).toBe('');
    });

    test('renders cancellation banner when cancel_at_period_end is true', () => {
        const products = getProductsData({numOfProducts: 1});
        const site = getSiteData({products, portalProducts: products.map(p => p.id)});
        const member = getMemberData({
            paid: true,
            subscriptions: [
                getSubscriptionData({
                    status: 'active',
                    cancelAtPeriodEnd: true,
                    currentPeriodEnd: '2026-04-03T12:00:00.000Z',
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
        expect(queryByText(/Your subscription has been canceled/)).toBeInTheDocument();
    });

    test('banner includes expiry date', () => {
        const products = getProductsData({numOfProducts: 1});
        const site = getSiteData({products, portalProducts: products.map(p => p.id)});
        const member = getMemberData({
            paid: true,
            subscriptions: [
                getSubscriptionData({
                    status: 'active',
                    cancelAtPeriodEnd: true,
                    currentPeriodEnd: '2026-04-03T12:00:00.000Z',
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
        expect(queryByText(/Apr 2026/)).toBeInTheDocument();
    });

    test('continue button renders inside the banner', () => {
        const products = getProductsData({numOfProducts: 1});
        const site = getSiteData({products, portalProducts: products.map(p => p.id)});
        const member = getMemberData({
            paid: true,
            subscriptions: [
                getSubscriptionData({
                    status: 'active',
                    cancelAtPeriodEnd: true,
                    currentPeriodEnd: '2026-04-03T12:00:00.000Z',
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

        const {container, queryByText} = setup({site, member});
        const banner = container.querySelector('.gh-portal-cancel-banner');
        expect(banner).toBeInTheDocument();
        const button = queryByText('Resume subscription');
        expect(button).toBeInTheDocument();
        // Button should be inside the banner
        expect(banner.contains(button)).toBe(true);
    });
});
