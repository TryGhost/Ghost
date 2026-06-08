import {useEffect, useState} from 'react';
import {useLocation} from '@tryghost/admin-x-framework';

interface KeyboardShortcutsOptions {
    onOpenNewNote?: () => void;
    onOpenReply?: () => void;
    isReplyAvailable?: boolean;
    componentRef?: React.RefObject<HTMLElement>;
}

export const useKeyboardShortcuts = (options: KeyboardShortcutsOptions = {}) => {
    const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                (e.target instanceof HTMLElement && e.target.isContentEditable) ||
                e.target instanceof HTMLSelectElement
            ) {
                return;
            }

            // Don't trigger if modifier keys are pressed
            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
                return;
            }

            // Check if there's an open dialog
            const openDialog = document.querySelector('[role="dialog"][data-state="open"]');

            // If a dialog is open, only respond if this component is inside the dialog
            if (openDialog) {
                const component = options.componentRef?.current;
                const isComponentInDialog = component?.closest('[role="dialog"]') === openDialog;
                if (!isComponentInDialog) {
                    return;
                }
            }

            switch (e.key.toLowerCase()) {
            case 'n':
                // Don't allow new note when any dialog is open
                if (!openDialog) {
                    e.preventDefault();
                    if (options.onOpenNewNote) {
                        options.onOpenNewNote();
                    } else {
                        setIsNewNoteModalOpen(true);
                    }
                }
                break;
            case 'r':
                if (options.isReplyAvailable && options.onOpenReply) {
                    const isReaderOrNote = location.pathname.includes('/notes/') || location.pathname.includes('/reader/');

                    if (isReaderOrNote) {
                        e.preventDefault();
                        options.onOpenReply();
                    }
                }
                break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [options, location.pathname]);

    return {
        isNewNoteModalOpen,
        setIsNewNoteModalOpen
    };
};
