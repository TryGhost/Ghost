import TierDetailPreview from '@/settings/membership/tiers/tier-detail-preview';
import { render, screen } from '@testing-library/react';

describe('TierDetailPreview', () => {
  it('removes only the deleted benefit when duplicate labels exist', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const tier = {
      trial_days: '0',
      benefits: ['Repeated benefit', 'Repeated benefit', 'Other benefit'],
    };
    const { rerender } = render(<TierDetailPreview isFreeTier={false} tier={tier} />);

    expect(screen.getAllByText('Repeated benefit').length).toBe(2);

    rerender(
      <TierDetailPreview
        isFreeTier={false}
        tier={{ ...tier, benefits: ['Repeated benefit', 'Other benefit'] }}
      />,
    );

    expect(screen.getAllByText('Repeated benefit').length).toBe(1);
    expect(screen.getByText('Other benefit')).toBeTruthy();
    expect(
      consoleError.mock.calls.some((call) =>
        call.some((value) => String(value).includes('same key')),
      ),
    ).toBe(false);

    consoleError.mockRestore();
  });
});
