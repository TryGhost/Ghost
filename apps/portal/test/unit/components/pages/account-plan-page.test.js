import {generateAccountPlanFixture, getSiteData, getProductsData, getProductData, getPriceData, getFreeProduct, getMemberData, getSubscriptionData, getOfferData} from '../../../../src/utils/fixtures-generator';
import {render, fireEvent} from '../../../utils/test-utils';
import AccountPlanPage from '../../../../src/components/pages/account-plan-page';

const setup = (overrides) => {
    const {mockDoActionFn, context, ...utils} = render(
        <AccountPlanPage />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );
    const monthlyCheckboxEl = utils.getByTestId('monthly-switch');
    const yearlyCheckboxEl = utils.getByTestId('yearly-switch');
    const continueBtn = utils.queryByRole('button', {name: 'Continue'});
    const chooseBtns = utils.queryAllByRole('button', {name: 'Choose'});
    return {
        monthlyCheckboxEl,
        yearlyCheckboxEl,
        continueBtn,
        chooseBtns,
        mockDoActionFn,
        context,
        ...utils
    };
};

const customSetup = (overrides) => {
    const {mockDoActionFn, context, ...utils} = render(
        <AccountPlanPage />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );

    return {
        mockDoActionFn,
        context,
        ...utils
    };
};

describe('Account Plan Page', () => {
    test('renders', () => {
        const {monthlyCheckboxEl, yearlyCheckboxEl, queryAllByRole} = setup();
        const continueBtn = queryAllByRole('button', {name: 'Continue'});
        expect(monthlyCheckboxEl).toBeInTheDocument();
        expect(yearlyCheckboxEl).toBeInTheDocument();
        expect(continueBtn).toHaveLength(1);
    });

    test('can choose plan and continue', async () => {
        const siteData = getSiteData({
            products: getProductsData({numOfProducts: 1})
        });
        const {mockDoActionFn, monthlyCheckboxEl, yearlyCheckboxEl, queryAllByRole} = setup({site: siteData});
        const continueBtn = queryAllByRole('button', {name: 'Continue'});

        fireEvent.click(monthlyCheckboxEl);
        expect(monthlyCheckboxEl.className).toEqual('gh-portal-btn active');
        fireEvent.click(yearlyCheckboxEl);
        expect(yearlyCheckboxEl.className).toEqual('gh-portal-btn active');
        fireEvent.click(continueBtn[0]);
        expect(mockDoActionFn).toHaveBeenCalledWith('checkoutPlan', {plan: siteData.products[0].yearlyPrice.id});
    });

    test('can cancel subscription for member on hidden tier', async () => {
        const overrides = generateAccountPlanFixture();
        const {queryByRole, queryByText} = customSetup(overrides);
        const cancelButton = queryByRole('button', {name: 'Cancel subscription'});
        expect(cancelButton).toBeInTheDocument();
        fireEvent.click(cancelButton);

        // Check that the cancellation message is present
        const cancellationMessage = queryByText(/If you cancel your subscription now, you will continue to have access until/i);
        expect(cancellationMessage).toBeInTheDocument();

        // Ensure the message doesn't contain the raw interpolation placeholder
        expect(cancellationMessage.textContent).not.toContain('{periodEnd}');

        const confirmCancelButton = queryByRole('button', {name: 'Confirm cancellation'});
        expect(confirmCancelButton).toBeInTheDocument();
    });

    test('shows percent retention offer copy', async () => {
        const paidProduct = getProductData({
            name: 'Basic',
            monthlyPrice: getPriceData({interval: 'month', amount: 1000, currency: 'usd'}),
            yearlyPrice: getPriceData({interval: 'year', amount: 10000, currency: 'usd'})
        });
        const products = [paidProduct, getFreeProduct({})];
        const site = getSiteData({
            products,
            portalProducts: [paidProduct.id]
        });
        const member = getMemberData({
            paid: true,
            subscriptions: [
                getSubscriptionData({
                    status: 'active',
                    interval: 'month',
                    amount: paidProduct.monthlyPrice.amount,
                    currency: 'USD',
                    priceId: paidProduct.monthlyPrice.id
                })
            ]
        });

        const retentionOffer = {
            ...getOfferData({
                type: 'percent',
                amount: 20,
                cadence: 'month',
                duration: 'once',
                tierId: paidProduct.id,
                tierName: paidProduct.name
            }),
            redemption_type: 'retention'
        };

        const {queryByRole, queryByText} = customSetup({site, member, offers: [retentionOffer]});
        const cancelButton = queryByRole('button', {name: 'Cancel subscription'});

        fireEvent.click(cancelButton);

        expect(queryByText('20% off')).toBeInTheDocument();
        expect(queryByText('Save 20% on your next billing cycle. Then $10/month.')).toBeInTheDocument();
    });

    test('shows free months retention offer copy', async () => {
        const paidProduct = getProductData({
            name: 'Basic',
            monthlyPrice: getPriceData({interval: 'month', amount: 1000, currency: 'usd'}),
            yearlyPrice: getPriceData({interval: 'year', amount: 10000, currency: 'usd'})
        });
        const products = [paidProduct, getFreeProduct({})];
        const site = getSiteData({
            products,
            portalProducts: [paidProduct.id]
        });
        const member = getMemberData({
            paid: true,
            subscriptions: [
                getSubscriptionData({
                    status: 'active',
                    interval: 'month',
                    amount: paidProduct.monthlyPrice.amount,
                    currency: 'USD',
                    priceId: paidProduct.monthlyPrice.id
                })
            ]
        });

        const retentionOffer = {
            ...getOfferData({
                type: 'free_months',
                amount: 1,
                cadence: 'month',
                duration: 'free_months',
                tierId: paidProduct.id,
                tierName: paidProduct.name
            }),
            redemption_type: 'retention'
        };

        const {queryByRole, queryByText} = customSetup({site, member, offers: [retentionOffer]});
        const cancelButton = queryByRole('button', {name: 'Cancel subscription'});

        fireEvent.click(cancelButton);

        expect(queryByText('1 month free')).toBeInTheDocument();
        expect(queryByText('Enjoy 1 month on us. Your next billing date will be pushed back by 30 days.')).toBeInTheDocument();
    });

    test('shows forever percent retention offer copy', async () => {
        const paidProduct = getProductData({
            name: 'Basic',
            monthlyPrice: getPriceData({interval: 'month', amount: 1000, currency: 'usd'}),
            yearlyPrice: getPriceData({interval: 'year', amount: 10000, currency: 'usd'})
        });
        const products = [paidProduct, getFreeProduct({})];
        const site = getSiteData({
            products,
            portalProducts: [paidProduct.id]
        });
        const member = getMemberData({
            paid: true,
            subscriptions: [
                getSubscriptionData({
                    status: 'active',
                    interval: 'month',
                    amount: paidProduct.monthlyPrice.amount,
                    currency: 'USD',
                    priceId: paidProduct.monthlyPrice.id
                })
            ]
        });

        const retentionOffer = {
            ...getOfferData({
                type: 'percent',
                amount: 20,
                cadence: 'month',
                duration: 'forever',
                tierId: paidProduct.id,
                tierName: paidProduct.name
            }),
            redemption_type: 'retention'
        };

        const {queryByRole, queryByText} = customSetup({site, member, offers: [retentionOffer]});
        const cancelButton = queryByRole('button', {name: 'Cancel subscription'});

        fireEvent.click(cancelButton);

        expect(queryByText('20% off')).toBeInTheDocument();
        expect(queryByText('Enjoy 20% off forever.')).toBeInTheDocument();
    });

    test('shows repeating percent retention offer copy for multiple billing cycles', async () => {
        const paidProduct = getProductData({
            name: 'Basic',
            monthlyPrice: getPriceData({interval: 'month', amount: 1000, currency: 'usd'}),
            yearlyPrice: getPriceData({interval: 'year', amount: 10000, currency: 'usd'})
        });
        const products = [paidProduct, getFreeProduct({})];
        const site = getSiteData({
            products,
            portalProducts: [paidProduct.id]
        });
        const member = getMemberData({
            paid: true,
            subscriptions: [
                getSubscriptionData({
                    status: 'active',
                    interval: 'month',
                    amount: paidProduct.monthlyPrice.amount,
                    currency: 'USD',
                    priceId: paidProduct.monthlyPrice.id
                })
            ]
        });

        const retentionOffer = {
            ...getOfferData({
                type: 'percent',
                amount: 20,
                cadence: 'month',
                duration: 'repeating',
                durationInMonths: 3,
                tierId: paidProduct.id,
                tierName: paidProduct.name
            }),
            redemption_type: 'retention'
        };

        const {queryByRole, queryByText} = customSetup({site, member, offers: [retentionOffer]});
        const cancelButton = queryByRole('button', {name: 'Cancel subscription'});

        fireEvent.click(cancelButton);

        expect(queryByText('20% off')).toBeInTheDocument();
        expect(queryByText('Save 20% on your next 3 billing cycles. Then $10/month.')).toBeInTheDocument();
    });
});
