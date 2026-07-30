import * as React from 'react';

type OverlayOpenProps = {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
};

/**
 * Keeps Escape dismissal inside an open overlay before ancestor layers, such
 * as SettingsModal, receive the event.
 */
export const useOverlayEscape = ({
    open: controlledOpen,
    defaultOpen,
    onOpenChange
}: OverlayOpenProps) => {
    const isControlled = controlledOpen !== undefined;
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
    const open = isControlled ? controlledOpen : internalOpen;

    const handleOpenChange = React.useCallback((next: boolean) => {
        if (!isControlled) {
            setInternalOpen(next);
        }
        onOpenChange?.(next);
    }, [isControlled, onOpenChange]);

    const handleOpenChangeRef = React.useRef(handleOpenChange);
    React.useEffect(() => {
        handleOpenChangeRef.current = handleOpenChange;
    }, [handleOpenChange]);

    React.useEffect(() => {
        if (!open) {
            return;
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            handleOpenChangeRef.current(false);
        };

        document.addEventListener('keydown', handleEscape, {capture: true});
        return () => document.removeEventListener('keydown', handleEscape, {capture: true});
    }, [open]);

    return {
        open,
        onOpenChange: handleOpenChange
    };
};
