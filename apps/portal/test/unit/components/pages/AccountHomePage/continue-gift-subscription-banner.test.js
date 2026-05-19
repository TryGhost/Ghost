import {render} from '../../../../utils/test-utils';
import ContinueGiftSubscriptionBanner from '../../../../../src/components/pages/AccountHomePage/components/continue-gift-subscription-banner';
import {getMemberData, getProductsData, getSiteData, getSubscriptionData} from '../../../../../src/utils/fixtures-generator';

const setup = (overrides) => {
    return render(
        <ContinueGiftSubscriptionBanner />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );
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

describe('ContinueGiftSubscriptionBanner', () => {
    test('renders the "Continue subscription" button for a gift member on an active tier', () => {
        const products = getProductsData({numOfProducts: 1});
        const site = getSiteData({products, portalProducts: products.map(p => p.id)});
        const member = buildGiftMember({tierId: products[0].id});

        const {queryByText} = setup({site, member});

        expect(queryByText('Continue subscription')).toBeInTheDocument();
    });

    test('renders nothing when Stripe is disconnected', () => {
        const products = getProductsData({numOfProducts: 1});
        const site = getSiteData({
            products,
            portalProducts: products.map(p => p.id),
            isStripeConfigured: false
        });
        const member = buildGiftMember({tierId: products[0].id});

        const {queryByText} = setup({site, member});

        expect(queryByText('Continue subscription')).not.toBeInTheDocument();
    });

    test('renders nothing for a non-gift member', () => {
        const products = getProductsData({numOfProducts: 1});
        const site = getSiteData({products, portalProducts: products.map(p => p.id)});
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

        const {queryByText} = setup({site, member});

        expect(queryByText('Continue subscription')).not.toBeInTheDocument();
    });

    test('renders nothing when the gift tier has been archived', () => {
        const products = getProductsData({numOfProducts: 1});
        const site = getSiteData({products, portalProducts: products.map(p => p.id)});
        // Member's tier id is not in site.products → archived tier
        const member = buildGiftMember({tierId: 'product_archived'});

        const {queryByText} = setup({site, member});

        expect(queryByText('Continue subscription')).not.toBeInTheDocument();
    });
});
