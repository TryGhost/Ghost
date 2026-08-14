import NiceModal from '@ebay/nice-modal-react';
import {act, render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {SettingsModal, settingsModalVariants, type SettingsModalSize} from '@/components/patterns/settings-modal';

const TestSettingsModal = NiceModal.create(() => (
    <SettingsModal title='Test modal' onOk={() => undefined}>
        Modal content
    </SettingsModal>
));

describe('SettingsModal', () => {
    it.each<SettingsModalSize>(['sm', 'md', 'lg', 'xl', 'full'])('uses the standard dialog radius for the %s size', (size) => {
        expect(settingsModalVariants({size})).toContain('rounded-lg');
    });

    it('keeps the edge-to-edge bleed size square', () => {
        const size: SettingsModalSize = 'bleed';

        expect(settingsModalVariants({size})).not.toContain('rounded-lg');
    });

    it('uses content-sized outline and primary actions by default', async () => {
        render(<NiceModal.Provider />);

        act(() => {
            void NiceModal.show(TestSettingsModal);
        });

        const cancelButton = await screen.findByRole('button', {name: 'Cancel'});
        const okButton = screen.getByRole('button', {name: 'OK'});

        expect(cancelButton.className).toContain('border-control-border');
        expect(cancelButton.className).toContain('bg-transparent');
        expect(cancelButton.className).not.toContain('hover:bg-accent');
        expect(okButton.className).not.toContain('min-w-20');

        act(() => {
            void NiceModal.remove(TestSettingsModal);
        });
    });
});
