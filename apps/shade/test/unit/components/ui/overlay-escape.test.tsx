import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useState} from 'react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

import {SettingsModal} from '@/components/patterns/settings-modal';
import {Combobox, ComboboxContent, ComboboxTrigger} from '@/components/ui/combobox';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

type OverlayProps = {
    defaultOpen?: boolean;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
    onOpenChange: (open: boolean) => void;
    open?: boolean;
};

const overlayCases = [
    ['DropdownMenu', ({onEscapeKeyDown, ...props}: OverlayProps) => (
        <DropdownMenu {...props}>
            <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
            <DropdownMenuContent onEscapeKeyDown={onEscapeKeyDown}>
                <DropdownMenuItem>Menu item</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )],
    ['Select', ({onEscapeKeyDown, ...props}: OverlayProps) => (
        <Select {...props}>
            <SelectTrigger aria-label="Test select"><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent onEscapeKeyDown={onEscapeKeyDown}>
                <SelectItem value="one">Option one</SelectItem>
            </SelectContent>
        </Select>
    )],
    ['Popover', ({onEscapeKeyDown, ...props}: OverlayProps) => (
        <Popover {...props}>
            <PopoverTrigger>Open popover</PopoverTrigger>
            <PopoverContent onEscapeKeyDown={onEscapeKeyDown}>Popover content</PopoverContent>
        </Popover>
    )],
    ['Combobox', ({onEscapeKeyDown, ...props}: OverlayProps) => (
        <Combobox {...props}>
            <ComboboxTrigger>Open combobox</ComboboxTrigger>
            <ComboboxContent onEscapeKeyDown={onEscapeKeyDown}>Combobox content</ComboboxContent>
        </Combobox>
    )]
] as const;

describe('nested overlay Escape behavior', () => {
    beforeAll(() => {
        HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    it.each(overlayCases)('closes an uncontrolled %s before its parent SettingsModal', async (_name, Overlay) => {
        const onCancel = vi.fn();
        const onOpenChange = vi.fn();
        render(
            <SettingsModal title="Test modal" onCancel={onCancel} onClose={vi.fn()}>
                <Overlay defaultOpen onOpenChange={onOpenChange} />
            </SettingsModal>
        );

        await screen.findByText(/Menu item|Option one|Popover content|Combobox content/);
        fireEvent.keyDown(document, {key: 'Escape'});

        await waitFor(() => {
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
        expect(onCancel).not.toHaveBeenCalled();

        fireEvent.keyDown(document, {key: 'Escape'});

        await waitFor(() => {
            expect(onCancel).toHaveBeenCalledOnce();
        });
    });

    it('preserves controlled overlay state behavior', async () => {
        const onCancel = vi.fn();
        const onOpenChange = vi.fn();
        const ControlledOverlay = () => {
            const [open, setOpen] = useState(true);

            return (
                <Popover open={open} onOpenChange={(nextOpen) => {
                    onOpenChange(nextOpen);
                    setOpen(nextOpen);
                }}>
                    <PopoverTrigger>Open popover</PopoverTrigger>
                    <PopoverContent>Controlled content</PopoverContent>
                </Popover>
            );
        };
        render(
            <SettingsModal title="Test modal" onCancel={onCancel} onClose={vi.fn()}>
                <ControlledOverlay />
            </SettingsModal>
        );

        await screen.findByText('Controlled content');
        fireEvent.keyDown(document, {key: 'Escape'});

        await waitFor(() => {
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('closes only the innermost of two open overlays', async () => {
        const onCancel = vi.fn();
        const onOuterOpenChange = vi.fn();
        const onInnerOpenChange = vi.fn();
        render(
            <SettingsModal title="Test modal" onCancel={onCancel} onClose={vi.fn()}>
                <Popover defaultOpen onOpenChange={onOuterOpenChange}>
                    <PopoverTrigger>Open outer</PopoverTrigger>
                    <PopoverContent>
                        Outer content
                        <DropdownMenu defaultOpen onOpenChange={onInnerOpenChange}>
                            <DropdownMenuTrigger>Open inner</DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem>Inner item</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </PopoverContent>
                </Popover>
            </SettingsModal>
        );

        await screen.findByText('Inner item');
        fireEvent.keyDown(document, {key: 'Escape'});

        await waitFor(() => {
            expect(onInnerOpenChange).toHaveBeenCalledWith(false);
        });
        expect(onOuterOpenChange).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();

        fireEvent.keyDown(document, {key: 'Escape'});

        await waitFor(() => {
            expect(onOuterOpenChange).toHaveBeenCalledWith(false);
        });
        expect(onCancel).not.toHaveBeenCalled();
    });

    it.each(overlayCases)('calls the %s content Escape callback', async (_name, Overlay) => {
        const onEscapeKeyDown = vi.fn();

        render(<Overlay defaultOpen onEscapeKeyDown={onEscapeKeyDown} onOpenChange={vi.fn()} />);
        await screen.findByText(/Menu item|Option one|Popover content|Combobox content/);
        fireEvent.keyDown(document, {key: 'Escape'});

        await waitFor(() => {
            expect(onEscapeKeyDown).toHaveBeenCalledOnce();
        });
    });

    it('keeps the modal open when a later document listener handles Escape', async () => {
        const onCancel = vi.fn();
        render(
            <SettingsModal title="Test modal" onCancel={onCancel} onClose={vi.fn()}>
                Modal content
            </SettingsModal>
        );
        await screen.findByText('Modal content');

        const handleNestedEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
            }
        };
        document.addEventListener('keydown', handleNestedEscape);
        try {
            fireEvent.keyDown(document, {key: 'Escape'});

            await new Promise((resolve) => {
                setTimeout(resolve);
            });
            expect(onCancel).not.toHaveBeenCalled();
        } finally {
            document.removeEventListener('keydown', handleNestedEscape);
        }
    });
});
