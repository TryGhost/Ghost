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
        const {getAllByText, getByLabelText, getByRole, mockDoActionFn} = setup(site);

        expect(getByRole('radio', {name: '1 month'})).toHaveAttribute('aria-checked', 'true');
        expect(getByRole('radio', {name: '3 months'})).toHaveAttribute('aria-checked', 'false');
        expect(getByRole('radio', {name: '6 months'})).toBeInTheDocument();
        expect(getByRole('radio', {name: '12 months'})).toBeInTheDocument();
        expect(getAllByText('$5').length).toBeGreaterThan(0);

        fireEvent.click(getByRole('radio', {name: '3 months'}));

        expect(getByRole('radio', {name: '1 month'})).toHaveAttribute('aria-checked', 'false');
        expect(getByRole('radio', {name: '3 months'})).toHaveAttribute('aria-checked', 'true');
        expect(getAllByText('$15').length).toBeGreaterThan(0);

        fireEvent.change(getByLabelText('Your name'), {target: {value: 'Jamie'}});
        fireEvent.click(getByRole('button', {name: 'Continue to delivery details'}));
        fireEvent.change(getByLabelText('Recipient\'s name'), {target: {value: 'Taylor'}});
        fireEvent.change(getByLabelText('Recipient\'s email'), {target: {value: 'recipient@example.com'}});
        fireEvent.change(getByLabelText('Optional message'), {target: {value: 'Enjoy!'}});
        fireEvent.click(getByRole('button', {name: 'Continue to payment'}));

        expect(mockDoActionFn).toHaveBeenCalledWith('checkoutGift', {
            tierId: 'tier_123',
            duration: 3,
            deliveryMethod: 'email',
            recipientEmail: 'recipient@example.com',
            recipientName: 'Taylor',
            buyerName: 'Jamie',
            personalMessage: 'Enjoy!',
            deliverAt: null
        });
    });

    test('defaults to 12 months for a yearly Portal default', () => {
        const site = buildSite({
            labs: {
                giftSubCustomization: true
            },
            portalDefaultPlan: 'yearly'
        });
        const {getByRole} = setup(site);

        expect(getByRole('radio', {name: '12 months'})).toHaveAttribute('aria-checked', 'true');
    });

    test('omits the selector when only one duration is available', () => {
        const site = buildSite({
            labs: {
                giftSubCustomization: true
            },
            portalPlans: ['yearly']
        });
        const {getByText, queryByRole} = setup(site);

        expect(queryByRole('radiogroup', {name: 'Gift duration'})).not.toBeInTheDocument();
        expect(getByText('12 month membership')).toBeInTheDocument();
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

        expect(getByRole('radio', {name: '1 month'})).toHaveAttribute('aria-checked', 'true');
        expect(getByRole('radio', {name: '3 months'})).toBeInTheDocument();
        expect(getByRole('radio', {name: '6 months'})).toBeInTheDocument();
        expect(queryByRole('radio', {name: '12 months'})).not.toBeInTheDocument();
    });

    test('keeps email details locally but omits them from link delivery', () => {
        const site = buildSite({labs: {giftSubCustomization: true}});
        const {getByLabelText, getByRole, mockDoActionFn} = setup(site);

        fireEvent.click(getByRole('button', {name: 'Continue to delivery details'}));
        fireEvent.change(getByLabelText('Recipient\'s name'), {target: {value: 'Taylor'}});
        fireEvent.change(getByLabelText('Recipient\'s email'), {target: {value: 'recipient@example.com'}});
        fireEvent.change(getByLabelText('Optional message'), {target: {value: 'Enjoy!'}});

        fireEvent.click(getByRole('radio', {name: 'I\'ll share it myself'}));
        fireEvent.click(getByRole('radio', {name: 'Email it to them now'}));

        expect(getByLabelText('Recipient\'s name')).toHaveValue('Taylor');
        expect(getByLabelText('Recipient\'s email')).toHaveValue('recipient@example.com');
        expect(getByLabelText('Optional message')).toHaveValue('Enjoy!');

        fireEvent.click(getByRole('radio', {name: 'I\'ll share it myself'}));
        fireEvent.click(getByRole('button', {name: 'Continue to payment'}));

        expect(mockDoActionFn).toHaveBeenCalledWith('checkoutGift', {
            tierId: 'tier_123',
            duration: 1,
            deliveryMethod: 'link',
            deliverAt: null
        });
    });
});
