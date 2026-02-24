import {generateAccountPlanFixture, getSiteData, getProductsData, getOfferData, getProductData, getPriceData, getMemberData, getSubscriptionData} from '../../../../src/utils/fixtures-generator';
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

    test('triggers cancellation flow when opened with cancel pageData', () => {
        const overrides = generateAccountPlanFixture();
        const subscriptionId = overrides.member.subscriptions[0].id;
        const {queryByText, queryByRole} = customSetup({
            ...overrides,
            pageData: {action: 'cancel', subscriptionId}
        });

        // Should immediately show cancellation confirmation
        const cancellationMessage = queryByText(/If you cancel your subscription now, you will continue to have access until/i);
        expect(cancellationMessage).toBeInTheDocument();

        const confirmCancelButton = queryByRole('button', {name: 'Confirm cancellation'});
        expect(confirmCancelButton).toBeInTheDocument();
    });

    test('shows retention offer when opened with cancel pageData and retention offers exist', async () => {
        const paidProduct = getProductData({
            name: 'Basic',
            monthlyPrice: getPriceData({interval: 'month', amount: 1000, currency: 'usd'}),
            yearlyPrice: getPriceData({interval: 'year', amount: 10000, currency: 'usd'})
        });
        const products = [paidProduct, getProductData({type: 'free'})];
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
        const subscriptionId = member.subscriptions[0].id;
        const retentionOffer = getOfferData({
            redemptionType: 'retention',
            name: 'Stay with us',
            amount: 20,
            type: 'percent',
            cadence: 'month',
            tierId: paidProduct.id,
            tierName: paidProduct.name
        });
        const {findByRole} = customSetup({
            site,
            member,
            offers: [retentionOffer],
            pageData: {action: 'cancel', subscriptionId}
        });

        // Should show retention offer section instead of cancellation confirmation
        const acceptOfferButton = await findByRole('button', {name: 'Continue subscription'});
        expect(acceptOfferButton).toBeInTheDocument();
    });

    test('refreshes retention preview details when offer context changes', () => {
        const paidProduct = getProductData({
            name: 'Basic',
            monthlyPrice: getPriceData({interval: 'month', amount: 1000, currency: 'usd'}),
            yearlyPrice: getPriceData({interval: 'year', amount: 10000, currency: 'usd'})
        });
        const products = [paidProduct, getProductData({type: 'free'})];
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
        const subscriptionId = member.subscriptions[0].id;

        const firstOffer = getOfferData({
            redemptionType: 'retention',
            displayTitle: 'First retention title',
            displayDescription: 'First retention description',
            type: 'percent',
            amount: 10,
            cadence: 'month',
            tierId: paidProduct.id,
            tierName: paidProduct.name
        });
        const secondOffer = {
            ...firstOffer,
            amount: 25,
            display_title: 'Second retention title',
            display_description: 'Second retention description'
        };

        const {queryByText, context, rerender} = customSetup({
            site,
            member,
            offers: [firstOffer],
            pageData: {action: 'cancel', subscriptionId}
        });

        expect(queryByText('First retention title')).toBeInTheDocument();
        expect(queryByText('10% off')).toBeInTheDocument();

        context.offers = [secondOffer];
        context.pageData = {action: 'cancel', subscriptionId};
        rerender(<AccountPlanPage />);

        expect(queryByText('Second retention title')).toBeInTheDocument();
        expect(queryByText('25% off')).toBeInTheDocument();
    });

    test('clears pageData after triggering cancellation so it does not re-trigger on remount', () => {
        const overrides = generateAccountPlanFixture();
        const subscriptionId = overrides.member.subscriptions[0].id;
        const pageData = {action: 'cancel', subscriptionId};

        // First mount: should trigger cancellation flow
        const {unmount, queryByText} = customSetup({
            ...overrides,
            pageData
        });

        const cancellationMessage = queryByText(/If you cancel your subscription now, you will continue to have access until/i);
        expect(cancellationMessage).toBeInTheDocument();

        // pageData.action should have been cleared
        expect(pageData.action).toBeNull();

        unmount();

        // Second mount with the same pageData object: should NOT trigger cancellation flow
        const {queryByText: queryByText2, queryByRole: queryByRole2} = customSetup({
            ...overrides,
            pageData
        });

        const cancellationMessage2 = queryByText2(/If you cancel your subscription now/i);
        expect(cancellationMessage2).not.toBeInTheDocument();

        // Should show the normal plan page
        const cancelButton = queryByRole2('button', {name: 'Cancel subscription'});
        expect(cancelButton).toBeInTheDocument();
    });

    test('does not trigger cancellation flow when pageData has no cancel action', () => {
        const overrides = generateAccountPlanFixture();
        const {queryByText, queryByRole} = customSetup({
            ...overrides,
            pageData: {someOtherData: true}
        });

        // Should not show cancellation confirmation
        const cancellationMessage = queryByText(/If you cancel your subscription now/i);
        expect(cancellationMessage).not.toBeInTheDocument();

        // Should show the normal plan page with cancel button available
        const cancelButton = queryByRole('button', {name: 'Cancel subscription'});
        expect(cancelButton).toBeInTheDocument();
    });

    test('renders percent retention offers', async () => {
        const paidProduct = getProductData({
            name: 'Basic',
            monthlyPrice: getPriceData({interval: 'month', amount: 1000, currency: 'usd'}),
            yearlyPrice: getPriceData({interval: 'year', amount: 10000, currency: 'usd'})
        });
        const products = [paidProduct, getProductData({type: 'free'})];
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

    test('renders rounded cents for percent retention offers', async () => {
        const paidProduct = getProductData({
            name: 'Basic',
            monthlyPrice: getPriceData({interval: 'month', amount: 599, currency: 'usd'}),
            yearlyPrice: getPriceData({interval: 'year', amount: 10000, currency: 'usd'})
        });
        const products = [paidProduct, getProductData({type: 'free'})];
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

        const {container, queryByRole, queryByText} = customSetup({site, member, offers: [retentionOffer]});
        const cancelButton = queryByRole('button', {name: 'Cancel subscription'});

        fireEvent.click(cancelButton);

        const discountedAmount = container.querySelector('.gh-portal-product-price .amount');
        expect(discountedAmount).not.toBeNull();
        expect(discountedAmount).toHaveTextContent('4.79');
        expect(queryByText('Save 20% on your next billing cycle. Then $5.99/month.')).toBeInTheDocument();
    });

    test('renders fixed retention offers', async () => {
        const paidProduct = getProductData({
            name: 'Basic',
            monthlyPrice: getPriceData({interval: 'month', amount: 1000, currency: 'usd'}),
            yearlyPrice: getPriceData({interval: 'year', amount: 10000, currency: 'usd'})
        });
        const products = [paidProduct, getProductData({type: 'free'})];
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
                type: 'fixed',
                amount: 300,
                cadence: 'month',
                duration: 'once',
                currency: 'USD',
                tierId: paidProduct.id,
                tierName: paidProduct.name
            }),
            redemption_type: 'retention'
        };

        const {queryByRole, queryByText} = customSetup({site, member, offers: [retentionOffer]});
        const cancelButton = queryByRole('button', {name: 'Cancel subscription'});

        fireEvent.click(cancelButton);

        expect(queryByText('$3 off')).toBeInTheDocument();
        expect(queryByText('Save $3 on your next billing cycle. Then $10/month.')).toBeInTheDocument();
    });

    test('renders free months retention offers', async () => {
        const paidProduct = getProductData({
            name: 'Basic',
            monthlyPrice: getPriceData({interval: 'month', amount: 1000, currency: 'usd'}),
            yearlyPrice: getPriceData({interval: 'year', amount: 10000, currency: 'usd'})
        });
        const products = [paidProduct, getProductData({type: 'free'})];
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
        expect(queryByText('Enjoy 1 free month on us. Your next billing date will be 5 Nov 2022.')).toBeInTheDocument();
    });

    test('renders forever percent retention offers', async () => {
        const paidProduct = getProductData({
            name: 'Basic',
            monthlyPrice: getPriceData({interval: 'month', amount: 1000, currency: 'usd'}),
            yearlyPrice: getPriceData({interval: 'year', amount: 10000, currency: 'usd'})
        });
        const products = [paidProduct, getProductData({type: 'free'})];
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

    test('renders repeating percent offers', async () => {
        const paidProduct = getProductData({
            name: 'Basic',
            monthlyPrice: getPriceData({interval: 'month', amount: 1000, currency: 'usd'}),
            yearlyPrice: getPriceData({interval: 'year', amount: 10000, currency: 'usd'})
        });
        const products = [paidProduct, getProductData({type: 'free'})];
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
