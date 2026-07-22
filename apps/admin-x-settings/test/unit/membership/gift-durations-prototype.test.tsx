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
    it('seeds an editable amount row per stored duration', () => {
        renderPrototype([1, 12]);
        const amounts = screen.getAllByRole('spinbutton') as HTMLInputElement[];
        assert.equal(amounts.length, 2);
        assert.equal(amounts[0].value, '1');
        assert.equal(amounts[1].value, '1'); // 12 months → 1 year
    });

    it('pre-fills each price field with the derived default', () => {
        renderPrototype([1, 12]);
        // $5/mo × 1 month = 5; $50/yr × 1 year = 50 — as the field value, editable
        assert.ok(screen.getByDisplayValue('5'));
        assert.ok(screen.getByDisplayValue('50'));
    });

    it('lets the user override a price, then reset it back to default', () => {
        renderPrototype([1, 12]);
        const priceField = screen.getByDisplayValue('5') as HTMLInputElement;
        fireEvent.change(priceField, {target: {value: '9'}});
        assert.ok(screen.getByDisplayValue('9'));

        // A reset control appears once a price is overridden
        fireEvent.click(screen.getByRole('button', {name: /reset to default/i}));
        assert.ok(screen.getByDisplayValue('5'));
    });

    it('adapts the pre-filled price live when a duration amount is edited', () => {
        renderPrototype([1, 12]);
        const firstAmount = (screen.getAllByRole('spinbutton') as HTMLInputElement[])[0];
        // Change 1 month → 3 months: default becomes $5 × 3 = 15
        fireEvent.change(firstAmount, {target: {value: '3'}});
        assert.ok(screen.getByDisplayValue('15'));
    });

    it('allows the amount field to be cleared while editing, restoring it on blur', () => {
        renderPrototype([1, 12]);
        const firstAmount = (screen.getAllByRole('spinbutton') as HTMLInputElement[])[0];
        fireEvent.change(firstAmount, {target: {value: ''}});
        assert.equal(firstAmount.value, ''); // can be emptied
        fireEvent.blur(firstAmount);
        assert.equal(firstAmount.value, '1'); // normalised on blur
    });

    it('adds durations up to a maximum of 4', () => {
        renderPrototype([1, 12]);
        const addButton = screen.getByRole('button', {name: /add duration/i});
        fireEvent.click(addButton);
        fireEvent.click(addButton);
        assert.equal(screen.getAllByRole('spinbutton').length, 4);
        assert.ok(screen.getByRole('button', {name: /maximum of 4 durations/i}));
    });

    it('renders per-tier pricing fields when multiple tiers are offered', () => {
        const silver = {...tier, id: 'tier_2', name: 'Silver', monthly_price: 300, yearly_price: 3000} as Tier;
        renderPrototype([1], [tier, silver]);
        assert.ok(screen.getByText('Gold'));
        assert.ok(screen.getByText('Silver'));
        // Gold 1 month default = 5, Silver 1 month default = 3 (pre-filled values)
        assert.ok(screen.getByDisplayValue('5'));
        assert.ok(screen.getByDisplayValue('3'));
    });
});
