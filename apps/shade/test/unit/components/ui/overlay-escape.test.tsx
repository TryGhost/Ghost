import NiceModal from '@ebay/nice-modal-react';
import {act, fireEvent, render, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {SettingsModal} from '@/components/patterns/settings-modal';
import {DropdownMenu} from '@/components/ui/dropdown-menu';
import {Popover} from '@/components/ui/popover';
import {Select} from '@/components/ui/select';

const overlayCases = [
    ['DropdownMenu', DropdownMenu],
    ['Select', Select],
    ['Popover', Popover]
] as const;

describe('nested overlay Escape behavior', () => {
    it.each(overlayCases)('closes %s before its parent SettingsModal', async (_name, Overlay) => {
        const onCancel = vi.fn();
        const onOpenChange = vi.fn();
        const TestModal = NiceModal.create(() => (
            <SettingsModal title="Test modal" onCancel={onCancel}>
                <Overlay defaultOpen onOpenChange={onOpenChange} />
            </SettingsModal>
        ));

        render(<NiceModal.Provider />);

        act(() => {
            void NiceModal.show(TestModal);
        });

        fireEvent.keyDown(document, {key: 'Escape'});

        await waitFor(() => {
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
        expect(onCancel).not.toHaveBeenCalled();

        fireEvent.keyDown(document, {key: 'Escape'});

        await waitFor(() => {
            expect(onCancel).toHaveBeenCalledOnce();
        });

        act(() => {
            void NiceModal.remove(TestModal);
        });
    });
});
