import React from 'react';
import PropTypes from 'prop-types';
import {ReactComponent as CloseIcon} from '../../assets/icons/kg-close.svg';
import Portal from './Portal';

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
                className="fixed top-0 left-0 z-[1000] flex h-full w-full items-start justify-center overflow-hidden pt-8"
                onKeyDown={controlByKeys}
                role="dialog"
                aria-modal
            >
                <div className="fixed inset-0 h-[100vh] bg-black opacity-60" onClick={onClose}></div>
                <div className="relative rounded bg-white shadow-xl">
                    <button className="absolute top-6 right-6 cursor-pointer" aria-label="Close dialog" autoFocus>
                        <CloseIcon className="h-4 w-4 stroke-2 text-grey-400" onClick={onClose}/>
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
