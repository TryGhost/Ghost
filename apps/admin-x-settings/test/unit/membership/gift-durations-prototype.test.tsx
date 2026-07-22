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

// Amount inputs use min=1, price inputs use min=0 — used to tell them apart.
const amountInputs = () => (screen.getAllByRole('spinbutton') as HTMLInputElement[]).filter(i => i.getAttribute('min') === '1');

describe('GiftDurationsPrototype', () => {
    it('seeds an editable amount row per stored duration', () => {
        renderPrototype([1, 12]);
        const amounts = amountInputs();
        assert.equal(amounts.length, 2);
        assert.equal(amounts[0].value, '1');
        assert.equal(amounts[1].value, '1'); // 12 months → 1 year
    });

    it('shows the derived default as the price field placeholder (grey), not a set value', () => {
        renderPrototype([1, 12]);
        // $5/mo × 1 month = 5; $50/yr × 1 year = 50 — as the placeholder default
        assert.ok(screen.getByPlaceholderText('5'));
        assert.ok(screen.getByPlaceholderText('50'));
    });

    it('lets the user override a price, then reset it back to default', () => {
        renderPrototype([1, 12]);
        const priceField = screen.getByPlaceholderText('5') as HTMLInputElement;
        fireEvent.change(priceField, {target: {value: '9'}});
        assert.equal(priceField.value, '9');

        const resetButton = screen.getByRole('button', {name: /reset to default/i}) as HTMLButtonElement;
        assert.equal(resetButton.disabled, false);
        fireEvent.click(resetButton);
        // back to empty value with the default shown as placeholder
        assert.equal((screen.getByPlaceholderText('5') as HTMLInputElement).value, '');
    });

    it('reverts a price to its default (placeholder) when cleared — never 0', () => {
        renderPrototype([1, 12]);
        const priceField = screen.getByPlaceholderText('5') as HTMLInputElement;
        fireEvent.change(priceField, {target: {value: '9'}});
        assert.equal(priceField.value, '9');
        // Clearing drops the override; the field is empty and the default (5) shows
        fireEvent.change(priceField, {target: {value: ''}});
        const cleared = screen.getByPlaceholderText('5') as HTMLInputElement;
        assert.equal(cleared.value, '');
        assert.notEqual(cleared.value, '0');
    });

    it('disables the reset control until a price is overridden', () => {
        renderPrototype([1, 12]);
        const resetButton = screen.getByRole('button', {name: /reset to default/i}) as HTMLButtonElement;
        assert.equal(resetButton.disabled, true);
    });

    it('adapts the default price placeholder live when a duration amount is edited', () => {
        renderPrototype([1, 12]);
        fireEvent.change(amountInputs()[0], {target: {value: '3'}});
        // 3 months default = $5 × 3 = 15
        assert.ok(screen.getByPlaceholderText('15'));
    });

    it('allows the amount field to be cleared while editing, restoring it on blur', () => {
        renderPrototype([1, 12]);
        const firstAmount = amountInputs()[0];
        fireEvent.change(firstAmount, {target: {value: ''}});
        assert.equal(firstAmount.value, '');
        fireEvent.blur(firstAmount);
        assert.equal(firstAmount.value, '1');
    });

    it('adds durations up to a maximum of 4', () => {
        renderPrototype([1, 12]);
        const addButton = screen.getByRole('button', {name: /add duration/i});
        fireEvent.click(addButton);
        fireEvent.click(addButton);
        assert.equal(amountInputs().length, 4);
        assert.ok(screen.getByRole('button', {name: /maximum of 4 durations/i}));
    });

    it('renders per-tier pricing fields when multiple tiers are offered', () => {
        const silver = {...tier, id: 'tier_2', name: 'Silver', monthly_price: 300, yearly_price: 3000} as Tier;
        renderPrototype([1], [tier, silver]);
        assert.ok(screen.getByText('Gold'));
        assert.ok(screen.getByText('Silver'));
        // Gold 1 month default = 5, Silver 1 month default = 3 (placeholders)
        assert.ok(screen.getByPlaceholderText('5'));
        assert.ok(screen.getByPlaceholderText('3'));
    });
});
