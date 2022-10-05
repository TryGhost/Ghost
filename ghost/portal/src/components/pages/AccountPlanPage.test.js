import React from 'react';
import {generateAccountPlanFixture, getSiteData, getProductsData} from '../../utils/fixtures-generator';
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
    const monthlyCheckboxEl = utils.queryByRole('button', {name: 'Monthly'});
    const yearlyCheckboxEl = utils.queryByRole('button', {name: 'Yearly'});
    const continueBtn = utils.queryByRole('button', {name: 'Continue'});
    const chooseBtns = utils.queryAllByRole('button', {name: 'Choose'});
    return {
        monthlyCheckboxEl,
        yearlyCheckboxEl,
        continueBtn,
        chooseBtns,
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
        const {mockOnActionFn, monthlyCheckboxEl, yearlyCheckboxEl, queryAllByRole} = setup({site: siteData});
        const continueBtn = queryAllByRole('button', {name: 'Continue'});

        fireEvent.click(monthlyCheckboxEl);
        expect(monthlyCheckboxEl.className).toEqual('gh-portal-btn active');
        fireEvent.click(yearlyCheckboxEl);
        expect(yearlyCheckboxEl.className).toEqual('gh-portal-btn active');
        fireEvent.click(continueBtn[0]);
        expect(mockOnActionFn).toHaveBeenCalledWith('checkoutPlan', {plan: siteData.products[0].yearlyPrice.id});
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
