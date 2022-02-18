import React from 'react';
import {render} from '@testing-library/react';
import PlansSection from './PlansSection';

const setup = (overrides = {}) => {
    const mockOnPlanSelectFn = jest.fn();
    const props = {
        plans: [
            {type: 'free', price: 'Decide later', currency_symbol: '$', name: 'Free', id: 'free'},
            {type: 'month', price: 12, currency_symbol: '$', name: 'Monthly', id: 'monthly'},
            {type: 'year', price: 110, currency_symbol: '$', name: 'Yearly', id: 'yearly'}
        ],
        selectedPlan: 'Monthly',
        onPlanSelect: mockOnPlanSelectFn
    };
    const utils = render(
        <PlansSection {...props} />
    );

    const freeCheckboxEl = utils.getByLabelText('Free');
    const monthlyCheckboxEl = utils.getByLabelText('Monthly');
    const yearlyCheckboxEl = utils.getByLabelText('Yearly');
    return {
        freeCheckboxEl,
        monthlyCheckboxEl,
        yearlyCheckboxEl,
        mockOnPlanSelectFn,
        ...utils
    };
};

describe('InputField', () => {
    test('renders', () => {
        const {freeCheckboxEl, monthlyCheckboxEl, yearlyCheckboxEl} = setup();
        expect(freeCheckboxEl).toBeInTheDocument();
        expect(monthlyCheckboxEl).toBeInTheDocument();
        expect(yearlyCheckboxEl).toBeInTheDocument();
    });
});
