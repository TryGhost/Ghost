import {fireEvent, render} from '../../../utils/test-utils';
import BetaGiftPage from '../../../../src/components/pages/beta-gift-page';
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

function setup(site: SiteData, overrideContext: Record<string, unknown> = {}) {
    return render(<BetaGiftPage />, {
        overrideContext: {
            site,
            member: {
                email: 'buyer@example.com',
                status: 'free'
            },
            ...overrideContext
        }
    });
}

describe('BetaGiftPage', () => {
    test('offers the full fixed-duration catalogue and updates the price and request', () => {
        const site = buildSite({
            labs: {
                giftSubCustomization: true
            }
        });
        const {container, getAllByText, getByLabelText, getByRole, mockDoActionFn} = setup(site);

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
        expect(container.querySelector('.gh-portal-gift-email-lede')).toHaveTextContent('Jamie has gifted you a 3-month Premium membership to The Blueprint');
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
            personalMessage: 'Enjoy!'
        });
    });

    test('defaults to 12 months for a yearly Portal default', () => {
        const site = buildSite({
            labs: {
                giftSubCustomization: true
            },
            portalDefaultPlan: 'yearly'
        });
        const {container, getByRole} = setup(site);

        expect(getByRole('radio', {name: '12 months'})).toHaveAttribute('aria-checked', 'true');

        fireEvent.click(getByRole('button', {name: 'Continue to delivery details'}));
        expect(container.querySelector('.gh-portal-gift-email-lede')).toHaveTextContent('You\'ve been gifted a 1-year Premium membership to The Blueprint');
    });

    test('does not reuse buyer details left in page data by another flow', () => {
        const site = buildSite({labs: {giftSubCustomization: true}});
        const {getByLabelText, getByRole, getByText} = setup(site, {
            member: null,
            pageData: {
                email: 'previous@example.com',
                name: 'Previous visitor'
            }
        });

        expect(getByLabelText('Your email')).toHaveValue('');
        expect(getByLabelText('Your name')).toHaveValue('');

        fireEvent.click(getByRole('button', {name: 'Continue to delivery details'}));
        expect(getByText('Enter your email address')).toBeInTheDocument();

        fireEvent.change(getByLabelText('Your email'), {target: {value: 'b'}});
        expect(getByLabelText('Your email')).toHaveValue('b');
    });

    test('limits recipient details to the backend maximums', () => {
        const site = buildSite({labs: {giftSubCustomization: true}});
        const {getByLabelText, getByRole} = setup(site);

        expect(getByLabelText('Your name')).toHaveAttribute('maxlength', '191');

        fireEvent.click(getByRole('button', {name: 'Continue to delivery details'}));

        expect(getByLabelText('Recipient\'s email')).toHaveAttribute('maxlength', '191');
        expect(getByLabelText('Recipient\'s name')).toHaveAttribute('maxlength', '191');
    });

    test('requires a buyer name for email delivery', () => {
        const site = buildSite({labs: {giftSubCustomization: true}});
        const {getByLabelText, getByRole, getByText, mockDoActionFn} = setup(site);

        fireEvent.click(getByRole('button', {name: 'Continue to delivery details'}));
        fireEvent.change(getByLabelText('Recipient\'s email'), {target: {value: 'recipient@example.com'}});
        fireEvent.click(getByRole('button', {name: 'Continue to payment'}));

        expect(mockDoActionFn).not.toHaveBeenCalled();
        expect(getByText('Enter your name')).toBeInTheDocument();

        fireEvent.change(getByLabelText('Your name'), {target: {value: 'Jamie'}});
        fireEvent.click(getByRole('button', {name: 'Continue to delivery details'}));
        fireEvent.click(getByRole('button', {name: 'Continue to payment'}));

        expect(mockDoActionFn).toHaveBeenCalledWith('checkoutGift', expect.objectContaining({
            deliveryMethod: 'email',
            buyerName: 'Jamie'
        }));
    });

    test('does not let a hidden recipient error lock the plan step', () => {
        const site = buildSite({labs: {giftSubCustomization: true}});
        const {getByLabelText, getByRole, getByText} = setup(site);

        fireEvent.click(getByRole('button', {name: 'Continue to delivery details'}));
        fireEvent.click(getByRole('button', {name: 'Continue to payment'}));

        expect(getByText('Enter your name')).toBeInTheDocument();
        fireEvent.change(getByLabelText('Your name'), {target: {value: 'Jamie'}});
        expect(getByRole('button', {name: 'Continue to delivery details'})).not.toBeDisabled();

        fireEvent.click(getByRole('button', {name: 'Continue to delivery details'}));
        expect(getByText('Enter the recipient\'s email address')).toBeInTheDocument();
        expect(getByRole('button', {name: 'Continue to payment'})).toBeDisabled();
    });

    test('shows a buyer name field for a whitespace-only member name', () => {
        const site = buildSite({labs: {giftSubCustomization: true}});
        const {getByLabelText} = setup(site, {
            member: {
                email: 'buyer@example.com',
                name: '   ',
                status: 'free'
            }
        });

        expect(getByLabelText('Your name')).toBeInTheDocument();
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
        expect(getByText('1 year membership')).toBeInTheDocument();
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
            deliveryMethod: 'link'
        });
    });
});
