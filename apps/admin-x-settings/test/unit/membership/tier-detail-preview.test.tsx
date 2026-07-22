import TierDetailPreview from '@src/components/settings/membership/tiers/tier-detail-preview';
import assert from 'node:assert/strict';
import {render, screen} from '@testing-library/react';

describe('TierDetailPreview', () => {
    it('removes only the deleted benefit when duplicate labels exist', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const tier = {
            trial_days: '0',
            benefits: ['Repeated benefit', 'Repeated benefit', 'Other benefit']
        };
        const {rerender} = render(<TierDetailPreview isFreeTier={false} tier={tier} />);

        assert.equal(screen.getAllByText('Repeated benefit').length, 2);

        rerender(<TierDetailPreview isFreeTier={false} tier={{...tier, benefits: ['Repeated benefit', 'Other benefit']}} />);

        assert.equal(screen.getAllByText('Repeated benefit').length, 1);
        assert.ok(screen.getByText('Other benefit'));
        assert.equal(consoleError.mock.calls.some(call => call.some(value => String(value).includes('same key'))), false);

        consoleError.mockRestore();
    });
});
