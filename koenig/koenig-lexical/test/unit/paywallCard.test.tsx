import {PaywallCard} from '../../src/components/ui/cards/PaywallCard';
import {render, screen} from '@testing-library/react';

describe('PaywallCard', () => {
    it.each([
        ['members', 'Members only'],
        ['paid', 'Paid members only'],
        ['tiers', 'Selected tiers only']
    ])('reflects %s post access', (access, label) => {
        render(<PaywallCard access={access} />);

        expect(screen.getByTestId('paywall-card')).toHaveAttribute('data-post-access', access);
        expect(screen.getByTestId('paywall-card')).toHaveTextContent(label);
    });

    it('explains that the card has no effect on public posts', () => {
        render(<PaywallCard access="public" />);

        expect(screen.getByTestId('paywall-card')).toHaveClass('before:border-yellow', 'after:border-yellow');
        expect(screen.getByText('Public preview · No effect while post is public')).toHaveClass('text-yellow');
        expect(screen.getByText('Public preview · No effect while post is public')).not.toHaveClass('bg-yellow-100', 'dark:bg-yellow/20');
    });
});
