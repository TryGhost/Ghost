import {fireEvent, render} from '../../../utils/test-utils';
import GiftPage from '../../../../src/components/pages/gift-page';
import {getPriceData, getProductData, getSiteData} from '../../../../src/utils/fixtures-generator';

function buildSite() {
    const product = getProductData({
        id: 'tier_123',
        name: 'Premium',
        monthlyPrice: getPriceData({amount: 500, interval: 'month'}),
        yearlyPrice: getPriceData({amount: 5000, interval: 'year'})
    });

    return getSiteData({
        products: [product],
        portalProducts: [product.id],
        portalDefaultPlan: 'monthly'
    });
}

function setup(site: ReturnType<typeof buildSite>) {
    return render(<GiftPage />, {
        overrideContext: {
            site,
            member: {
                email: 'buyer@example.com',
                status: 'free'
            }
        }
    });
}

// Fixed-duration gifting now lives on BetaGiftPage, which serves every site with
// giftSubCustomization enabled, so this page is only ever the cadence-only flow.
describe('GiftPage', () => {
    test('preserves the cadence selector and cadence-only checkout', () => {
        const {getByRole, mockDoActionFn, queryByRole} = setup(buildSite());

        expect(getByRole('button', {name: '1 month'})).toBeInTheDocument();
        expect(getByRole('button', {name: '1 year'})).toBeInTheDocument();
        expect(queryByRole('button', {name: '3 months'})).not.toBeInTheDocument();

        fireEvent.click(getByRole('button', {name: 'Continue'}));

        expect(mockDoActionFn).toHaveBeenCalledWith('checkoutGift', {
            tierId: 'tier_123',
            cadence: 'month'
        });
    });
});
