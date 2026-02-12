import {generateAccountPlanFixture, getSiteData, getProductsData, getOfferData} from '../../../../src/utils/fixtures-generator';
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

    test('shows retention offer when opened with cancel pageData and retention offers exist', () => {
        const overrides = generateAccountPlanFixture();
        const subscriptionId = overrides.member.subscriptions[0].id;
        const paidProduct = overrides.site.products.find(p => p.type === 'paid');
        const retentionOffer = getOfferData({
            redemptionType: 'retention',
            name: 'Stay with us',
            amount: 20,
            type: 'percent',
            cadence: 'month',
            tierId: paidProduct.id,
            tierName: paidProduct.name
        });
        const {queryByText} = customSetup({
            ...overrides,
            offers: [retentionOffer],
            pageData: {action: 'cancel', subscriptionId}
        });

        // Should show retention offer message instead of cancellation confirmation
        const offerMessage = queryByText(/We'd hate to see you go/i);
        expect(offerMessage).toBeInTheDocument();
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
});
