import CloseIcon from '../../assets/icons/kg-close.svg?react';
import Portal from './Portal';
import PropTypes from 'prop-types';
import React from 'react';

// What Tab can reach, for keeping it inside the dialog
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({isOpen, onClose, labelledBy, children}) {
    const panelRef = React.useRef(null);

    // While open, focus starts in the dialog (a click anywhere in it keeps it there, so its keys
    // stay its own), and closing gives focus back to what opened it
    React.useEffect(() => {
        if (!isOpen) {
            return undefined;
        }
        const opener = document.activeElement;
        const panel = panelRef.current;
        // Unless something in it took focus already (an input set to autofocus)
        if (!panel?.contains(document.activeElement)) {
            panel?.focus({preventScroll: true});
        }

        return () => {
            // Only when focus was left behind (in the dialog, or on the page once it's gone): whoever
            // closed it may have put focus somewhere on purpose, as the Markdown editor does
            const active = document.activeElement;
            const isLost = !active || active === document.body || panel?.contains(active);
            if (isLost && opener instanceof HTMLElement && opener.isConnected) {
                opener.focus();
            }
        };
    }, [isOpen]);

    // Tab and Shift+Tab go round the dialog's controls, never out to the editor behind it
    const keepTabInside = (event) => {
        const focusable = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter(element => element.getClientRects().length > 0);
        if (!focusable.length) {
            event.preventDefault();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const current = document.activeElement;
        if (event.shiftKey && (current === first || current === panelRef.current)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && current === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const controlByKeys = (event) => {
        // Cmd/Ctrl shortcuts (copy, save…) go on to the browser and Admin as they always have
        if (event.metaKey || event.ctrlKey) {
            return;
        }
        // Other keys stay in the dialog, away from the editor behind it
        event.stopPropagation();
        if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
        }
        if (event.key === 'Tab') {
            keepTabInside(event);
        }
    };

    // A file dragged onto it stays with it: it never opens in the tab, nor reaches the editor behind
    const ignoreDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <Portal>
            <div
                aria-labelledby={labelledBy}
                className="fixed left-0 top-0 z-40 flex size-full items-start justify-center overflow-auto"
                role="dialog"
                aria-modal
                onDragOver={ignoreDrop}
                onDrop={ignoreDrop}
                onKeyDown={controlByKeys}
            >
                <div className="fixed inset-0 z-40 h-[100vh] bg-black opacity-60" onClick={onClose}></div>
                <div ref={panelRef} className="relative z-50 my-8 w-full max-w-[550px] rounded-lg bg-white drop-shadow-2xl focus:outline-none dark:bg-black" tabIndex={-1}>
                    <button aria-label="Close dialog" className="absolute right-6 top-6 cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-green" type="button" onClick={onClose}>
                        <CloseIcon aria-hidden="true" className="size-4 stroke-2 text-grey-400" />
                    </button>
                    {children}
                </div>
            </div>
        </Portal>
    );
}

Modal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    labelledBy: PropTypes.string,
    children: PropTypes.node
};
