import {render} from '../../../../utils/test-utils';
import AccountWelcome from '../../../../../src/components/pages/AccountHomePage/components/account-welcome';
import {getDiscountData, getMemberData, getNextPaymentData, getProductsData, getSiteData, getSubscriptionData} from '../../../../../src/utils/fixtures-generator';

const setup = (overrides) => {
    return render(
        <AccountWelcome />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );
};

describe('AccountWelcome', () => {
    test('uses current period end for renewal date on free months offers', () => {
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
                    currentPeriodEnd: '2099-01-15T12:00:00.000Z',
                    offer: {
                        type: 'percent',
                        amount: 100,
                        duration: 'repeating',
                        duration_in_months: 2,
                        redemption_type: 'retention'
                    },
                    nextPayment: getNextPaymentData({
                        originalAmount: 500,
                        amount: 0,
                        interval: 'month',
                        currency: 'USD',
                        discount: getDiscountData({
                            duration: 'repeating',
                            type: 'percent',
                            amount: 100,
                            end: '2099-03-15T12:00:00.000Z'
                        })
                    })
                })
            ]
        });

        const {queryByText} = setup({site, member});

        expect(queryByText('Your subscription will renew on 15 Jan 2099')).toBeInTheDocument();
        expect(queryByText('Your subscription will renew on 15 Mar 2099')).not.toBeInTheDocument();
    });
});
