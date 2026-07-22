import GiftDurationsPrototype from '@src/components/settings/membership/gift-subscriptions/gift-durations-prototype';
import assert from 'node:assert/strict';
import {type Tier} from '@tryghost/admin-x-framework/api/tiers';
import {fireEvent, render, screen} from '@testing-library/react';

const tier = {
    id: 'tier_1',
    name: 'Gold',
    currency: 'USD',
    monthly_price: 500, // $5.00
    yearly_price: 5000 // $50.00
} as Tier;

const renderPrototype = (initialMonths = [1, 12], tiers = [tier]) =>
    render(<GiftDurationsPrototype initialMonths={initialMonths} tiers={tiers} />);

describe('GiftDurationsPrototype', () => {
    it('seeds editable rows from stored month-counts (1 → month, 12 → year)', () => {
        renderPrototype([1, 12]);
        const units = screen.getAllByLabelText('Duration unit') as HTMLSelectElement[];
        const amounts = screen.getAllByLabelText('Duration amount') as HTMLInputElement[];
        assert.equal(amounts.length, 2);
        assert.equal(amounts[0].value, '1');
        assert.equal(units[0].value, 'month');
        assert.equal(amounts[1].value, '1');
        assert.equal(units[1].value, 'year');
    });

    it('derives the default price per duration as the editable field placeholder', () => {
        renderPrototype([1, 12]);
        // $5/mo × 1 month = 5; $50/yr × 1 year = 50 — shown as the field placeholder
        assert.ok(screen.getByPlaceholderText('5'));
        assert.ok(screen.getByPlaceholderText('50'));
    });

    it('lets the user override a price for a duration', () => {
        renderPrototype([1, 12]);
        const priceField = screen.getByPlaceholderText('5') as HTMLInputElement;
        fireEvent.change(priceField, {target: {value: '9'}});
        assert.equal((screen.getByPlaceholderText('5') as HTMLInputElement).value, '9');
    });

    it('adapts the price field placeholder live when a duration is edited', () => {
        renderPrototype([1, 12]);
        const firstAmount = (screen.getAllByLabelText('Duration amount') as HTMLInputElement[])[0];
        // Change 1 month → 3 months: default becomes $5 × 3 = 15
        fireEvent.change(firstAmount, {target: {value: '3'}});
        assert.ok(screen.getByPlaceholderText('15'));

        // Switch that row to years: 3 years = 36 months → yearly $50 × 3 = 150
        const firstUnit = (screen.getAllByLabelText('Duration unit') as HTMLSelectElement[])[0];
        fireEvent.change(firstUnit, {target: {value: 'year'}});
        assert.ok(screen.getByPlaceholderText('150'));
    });

    it('adds durations up to a maximum of 4', () => {
        renderPrototype([1, 12]);
        const addButton = screen.getByRole('button', {name: /add duration/i});
        fireEvent.click(addButton);
        fireEvent.click(addButton);
        assert.equal(screen.getAllByLabelText('Duration amount').length, 4);
        // At the cap the control is disabled and relabelled
        assert.ok(screen.getByRole('button', {name: /maximum of 4 durations/i}));
    });

    it('removes a duration but keeps at least one', () => {
        renderPrototype([1, 12]);
        const removeButtons = screen.getAllByLabelText('Remove duration');
        fireEvent.click(removeButtons[0]);
        assert.equal(screen.getAllByLabelText('Duration amount').length, 1);
        // The last remaining remove button is disabled
        const lastRemove = screen.getByLabelText('Remove duration') as HTMLButtonElement;
        assert.equal(lastRemove.disabled, true);
    });

    it('renders a per-tier heading and prices when multiple tiers are offered', () => {
        const silver = {...tier, id: 'tier_2', name: 'Silver', monthly_price: 300, yearly_price: 3000} as Tier;
        renderPrototype([1], [tier, silver]);
        assert.ok(screen.getByText('Gold'));
        assert.ok(screen.getByText('Silver'));
        // Gold 1 month default = 5, Silver 1 month default = 3 (field placeholders)
        assert.ok(screen.getByPlaceholderText('5'));
        assert.ok(screen.getByPlaceholderText('3'));
    });
});
