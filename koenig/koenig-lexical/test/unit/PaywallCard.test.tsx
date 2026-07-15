import {PaywallCard} from '../../src/components/ui/cards/PaywallCard';
import {fireEvent, render, screen} from '@testing-library/react';
import {vi} from 'vitest';

describe('PaywallCard', () => {
    it('explains why a public preview is inactive and exposes inline access choices', () => {
        const onSelectAccess = vi.fn();

        render(
            <PaywallCard
                canChangeAccess={true}
                showAccessEditor={true}
                visibility="public"
                onSelectAccess={onSelectAccess}
            />
        );

        expect(screen.getByText(/This post is public/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Members only'}));
        expect(onSelectAccess).toHaveBeenCalledWith('members');
    });

    it('summarizes configured access and lets the author change it in place', () => {
        const onChangeAccess = vi.fn();

        render(
            <PaywallCard
                canChangeAccess={true}
                visibility="paid"
                visibilityLabel="paid members"
                onChangeAccess={onChangeAccess}
            />
        );

        expect(screen.getByText('Only visible to paid members')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Change access'}));
        expect(onChangeAccess).toHaveBeenCalledOnce();
    });

    it('keeps tier selection inside the public preview element', () => {
        const onApplyTiers = vi.fn();
        const onToggleTier = vi.fn();

        render(
            <PaywallCard
                availableTiers={[
                    {active: true, id: 'supporter', name: 'Supporter', slug: 'supporter'},
                    {active: false, id: 'patron', name: 'Patron', slug: 'patron'}
                ]}
                canChangeAccess={true}
                selectedTierIds={['supporter']}
                showAccessEditor={true}
                showTierSelector={true}
                visibility="public"
                onApplyTiers={onApplyTiers}
                onToggleTier={onToggleTier}
            />
        );

        expect(screen.getByRole('checkbox', {name: 'Supporter'})).toBeChecked();
        expect(screen.getByText('Archived')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('checkbox', {name: /Patron/}));
        expect(onToggleTier).toHaveBeenCalledWith('patron');

        fireEvent.click(screen.getByRole('button', {name: 'Apply tier access'}));
        expect(onApplyTiers).toHaveBeenCalledOnce();
    });
});
