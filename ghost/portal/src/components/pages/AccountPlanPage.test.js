import React from 'react';
import {generateAccountPlanFixture, getSiteData, getProductsData} from '../../utils/fixtures';
import {render, fireEvent} from '../../utils/test-utils';
import AccountPlanPage from './AccountPlanPage';

const setup = (overrides) => {
    const {mockOnActionFn, context, ...utils} = render(
        <AccountPlanPage />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );
    const monthlyCheckboxEl = utils.getByLabelText('Monthly');
    const yearlyCheckboxEl = utils.getByLabelText('Yearly');
    const continueBtn = utils.queryByRole('button', {name: 'Continue'});
    return {
        monthlyCheckboxEl,
        yearlyCheckboxEl,
        continueBtn,
        mockOnActionFn,
        context,
        ...utils
    };
};

const customSetup = (overrides) => {
    const {mockOnActionFn, context, ...utils} = render(
        <AccountPlanPage />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );

    return {
        mockOnActionFn,
        context,
        ...utils
    };
};

describe('Account Plan Page', () => {
    test('renders', () => {
        const {monthlyCheckboxEl, yearlyCheckboxEl, continueBtn} = setup();

        expect(monthlyCheckboxEl).toBeInTheDocument();
        expect(yearlyCheckboxEl).toBeInTheDocument();
        expect(continueBtn).toBeInTheDocument();
    });

    test('can choose plan and continue', async () => {
        const siteData = getSiteData({
            products: getProductsData({numOfProducts: 1})
        });
        const {mockOnActionFn, monthlyCheckboxEl, yearlyCheckboxEl, continueBtn} = setup({site: siteData});
        fireEvent.click(monthlyCheckboxEl);
        expect(monthlyCheckboxEl.checked).toEqual(false);
        fireEvent.click(yearlyCheckboxEl);
        expect(yearlyCheckboxEl.checked).toEqual(true);
        expect(continueBtn).toBeEnabled();

        fireEvent.click(continueBtn);
        expect(mockOnActionFn).toHaveBeenCalledWith('checkoutPlan', {plan: siteData.products[0].monthlyPrice.id});
    });

    test('can cancel subscription for member on hidden tier', async () => {
        const overrides = generateAccountPlanFixture();
        const {queryByRole} = customSetup(overrides);
        const cancelButton = queryByRole('button', {name: 'Cancel subscription'});
        expect(cancelButton).toBeInTheDocument();
        fireEvent.click(cancelButton);
        const confirmCancelButton = queryByRole('button', {name: 'Confirm cancellation'});
        expect(confirmCancelButton).toBeInTheDocument();
    });
});
