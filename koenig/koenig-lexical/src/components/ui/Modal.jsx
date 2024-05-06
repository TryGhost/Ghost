import CloseIcon from '../../assets/icons/kg-close.svg?react';
import Portal from './Portal';
import PropTypes from 'prop-types';
import React from 'react';

export function Modal({isOpen, onClose, children}) {
    const controlByKeys = (event) => {
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
                <div className="relative z-50 my-8 w-full max-w-[550px] rounded-lg bg-white drop-shadow-2xl">
                    <button aria-label="Close dialog" className="absolute right-6 top-6 cursor-pointer" type="button" autoFocus>
                        <CloseIcon className="size-4 stroke-2 text-grey-400" onClick={onClose}/>
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
    children: PropTypes.node
};
