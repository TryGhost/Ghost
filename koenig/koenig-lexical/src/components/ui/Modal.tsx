import CloseIcon from '../../assets/icons/kg-close.svg?react';
import Portal from './Portal';
import React from 'react';

export interface ModalProps {
    isOpen?: boolean;
    onClose: () => void;
    children?: React.ReactNode;
}

export function Modal({isOpen, onClose, children}: ModalProps) {
    const controlByKeys = (event: React.KeyboardEvent) => {
        event.stopPropagation();
        event.preventDefault();

        if (event.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <Portal>
            <div
                className="fixed left-0 top-0 z-40 flex size-full items-start justify-center overflow-auto"
                role="dialog"
                aria-modal
                onKeyDown={controlByKeys}
            >
                <div className="fixed inset-0 z-40 h-[100vh] bg-black opacity-60" onClick={onClose}></div>
                <div className="relative z-50 my-8 w-full max-w-[550px] rounded-lg bg-white drop-shadow-2xl dark:bg-black">
                    <button aria-label="Close dialog" className="absolute right-6 top-6 cursor-pointer" type="button" autoFocus>
                        <CloseIcon className="size-4 stroke-2 text-grey-400" onClick={onClose}/>
                    </button>
                    {children}
                </div>
            </div>
        </Portal>
    );
}
