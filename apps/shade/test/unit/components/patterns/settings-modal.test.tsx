import NiceModal from '@ebay/nice-modal-react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

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

    it('renders without a NiceModal context and closes through onClose', () => {
        const onClose = vi.fn();
        render(
            <SettingsModal title='Test modal' topRightContent='close' onClose={onClose}>
                Modal content
            </SettingsModal>
        );

        fireEvent.click(screen.getByTestId('close-modal'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('confirms before closing through onClose when dirty', async () => {
        const onClose = vi.fn();
        render(
            <SettingsModal title='Test modal' topRightContent='close' dirty onClose={onClose}>
                Modal content
            </SettingsModal>
        );

        fireEvent.click(screen.getByTestId('close-modal'));
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.click(await screen.findByRole('button', {name: 'Leave'}));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    it('still closes through NiceModal when no onClose is passed', async () => {
        const BridgeModal = NiceModal.create(() => (
            <SettingsModal title='Bridge modal' topRightContent='close'>
                Modal content
            </SettingsModal>
        ));

        render(<NiceModal.Provider />);
        act(() => {
            void NiceModal.show(BridgeModal);
        });

        fireEvent.click(await screen.findByTestId('close-modal'));

        await waitFor(() => {
            expect(screen.queryByTestId('close-modal')).toBeNull();
        });
    });
});
