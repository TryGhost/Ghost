import React from 'react';
import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';

const CloseButton = (props) => {
    return (
        <button className="absolute top-6 right-6 opacity-20 transition-opacity duration-100 ease-out hover:opacity-40 sm:top-10 sm:right-8" onClick={props.close}>
            <CloseIcon className="h-[20px] w-[20px]" />
        </button>
    );
};

export default CloseButton;
