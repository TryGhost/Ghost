import CloseIcon from '../../assets/icons/kg-close.svg?react';
import Portal from './Portal';
import PropTypes from 'prop-types';
import React from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function shortcutKey(event) {
    if (!event.metaKey && !event.ctrlKey) {
        return null;
    }
    const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
    // A layout that types a non-Latin letter is read by its physical key, as Admin's global shortcuts are
    if (/^[ -~]$/.test(key)) {
        return key;
    }
    return event.code?.startsWith('Key') ? event.code.slice(3).toLowerCase() : null;
}

function tabWithin(event, panel) {
    const focusable = [...panel.querySelectorAll(FOCUSABLE)].filter(element => element.getClientRects().length > 0);
    if (!focusable.length) {
        event.preventDefault();
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;
    const isOutside = !panel.contains(current) || current === panel;
    if (event.shiftKey && (isOutside || current === first)) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && (isOutside || current === last)) {
        event.preventDefault();
        first.focus();
    }
}

function controlByKeys(event, panel, onClose) {
    // Admin saves on Cmd/Ctrl+S; its other shortcuts (search, preview, publish) would open over the dialog
    if (shortcutKey(event) === 's') {
        return;
    }
    event.stopPropagation();
    // Held back from Admin's preview, Cmd/Ctrl+P would print instead
    if (shortcutKey(event) === 'p') {
        event.preventDefault();
    }
    if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
    }
    if (event.key === 'Tab') {
        tabWithin(event, panel);
    }
}

export function Modal({isOpen, onClose, labelledBy, children}) {
    const panelRef = React.useRef(null);
    const onCloseRef = React.useRef(onClose);

    React.useLayoutEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    React.useEffect(() => {
        if (!isOpen) {
            return undefined;
        }
        const opener = document.activeElement;
        const panel = panelRef.current;
        if (!panel?.contains(document.activeElement)) {
            panel?.focus({preventScroll: true});
        }

        // Focus drops to the page when a focused control is disabled or removed; its keys are still the dialog's
        const onStrayKey = (event) => {
            if (event.target === document.body) {
                controlByKeys(event, panel, () => onCloseRef.current?.());
            }
        };
        document.addEventListener('keydown', onStrayKey, true);

        return () => {
            document.removeEventListener('keydown', onStrayKey, true);
            // Whoever closed it may have moved focus on purpose, as the Markdown editor does
            const active = document.activeElement;
            const isLost = !active || active === document.body || panel?.contains(active);
            // Focusing an editor puts its caret at the very start; on the page, typing reaches the card's caption
            if (isLost && opener instanceof HTMLElement && opener.isConnected && !opener.isContentEditable) {
                opener.focus({preventScroll: true});
            }
        };
    }, [isOpen]);

    const refuseDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'none';
        }
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
                onDragOver={refuseDrop}
                onDrop={refuseDrop}
                onKeyDown={event => controlByKeys(event, panelRef.current, onClose)}
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
