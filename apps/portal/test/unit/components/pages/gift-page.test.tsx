import {fireEvent, render} from '../../../utils/test-utils';
import GiftPage from '../../../../src/components/pages/gift-page';
import {getPriceData, getProductData, getSiteData} from '../../../../src/utils/fixtures-generator';

type SiteData = ReturnType<typeof getSiteData>;

function buildSite(overrides: Partial<Parameters<typeof getSiteData>[0]> = {}) {
    const product = getProductData({
        id: 'tier_123',
        name: 'Premium',
        monthlyPrice: getPriceData({amount: 500, interval: 'month'}),
        yearlyPrice: getPriceData({amount: 5000, interval: 'year'})
    });

    return getSiteData({
        products: [product],
        portalProducts: [product.id],
        portalDefaultPlan: 'monthly',
        ...overrides
    });
}

function setup(site: SiteData) {
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

describe('GiftPage', () => {
    test('preserves the cadence selector and cadence-only checkout when customization is disabled', () => {
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

    test('offers the full fixed-duration catalogue and updates the price and request', () => {
        const site = buildSite({
            labs: {
                giftSubCustomization: true
            }
        });
        const {getAllByText, getByRole, mockDoActionFn} = setup(site);

        expect(getByRole('button', {name: '1 month'})).toHaveAttribute('aria-pressed', 'true');
        expect(getByRole('button', {name: '3 months'})).toHaveAttribute('aria-pressed', 'false');
        expect(getByRole('button', {name: '6 months'})).toBeInTheDocument();
        expect(getByRole('button', {name: '12 months'})).toBeInTheDocument();
        expect(getAllByText('$5').length).toBeGreaterThan(0);

        fireEvent.click(getByRole('button', {name: '3 months'}));

        expect(getByRole('button', {name: '1 month'})).toHaveAttribute('aria-pressed', 'false');
        expect(getByRole('button', {name: '3 months'})).toHaveAttribute('aria-pressed', 'true');
        expect(getAllByText('$15').length).toBeGreaterThan(0);

        fireEvent.click(getByRole('button', {name: 'Continue'}));

        expect(mockDoActionFn).toHaveBeenCalledWith('checkoutGift', {
            tierId: 'tier_123',
            duration: 3
        });
    });

    test('defaults to 12 months for a yearly Portal default', () => {
        const site = buildSite({
            labs: {
                giftSubCustomization: true
            },
            portalDefaultPlan: 'yearly'
        });
        const {getByRole, mockDoActionFn} = setup(site);

        expect(getByRole('button', {name: '12 months'})).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(getByRole('button', {name: 'Continue'}));

        expect(mockDoActionFn).toHaveBeenCalledWith('checkoutGift', {
            tierId: 'tier_123',
            duration: 12
        });
    });

    test('omits the selector when only one duration is available', () => {
        const site = buildSite({
            labs: {
                giftSubCustomization: true
            },
            portalPlans: ['yearly']
        });
        const {getByRole, mockDoActionFn, queryByRole} = setup(site);

        expect(queryByRole('group', {name: 'Plan'})).not.toBeInTheDocument();

        fireEvent.click(getByRole('button', {name: 'Continue'}));

        expect(mockDoActionFn).toHaveBeenCalledWith('checkoutGift', {
            tierId: 'tier_123',
            duration: 12
        });
    });

    test('falls back to the first available duration when the default plan is unavailable', () => {
        const site = buildSite({
            labs: {
                giftSubCustomization: true
            },
            portalPlans: ['monthly'],
            portalDefaultPlan: 'yearly'
        });
        const {getByRole, queryByRole} = setup(site);

        expect(getByRole('button', {name: '1 month'})).toHaveAttribute('aria-pressed', 'true');
        expect(getByRole('button', {name: '3 months'})).toBeInTheDocument();
        expect(getByRole('button', {name: '6 months'})).toBeInTheDocument();
        expect(queryByRole('button', {name: '12 months'})).not.toBeInTheDocument();
    });
});
