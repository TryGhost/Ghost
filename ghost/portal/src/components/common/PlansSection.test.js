import React from 'react';
import {render} from '@testing-library/react';
import PlansSection from './PlansSection';

const setup = (overrides = {}) => {
    const mockOnPlanSelectFn = jest.fn();
    const props = {
        plans: {
            monthly: 12,
            yearly: 110,
            currency: 'USD',
            currency_symbol: '$'
        },
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
