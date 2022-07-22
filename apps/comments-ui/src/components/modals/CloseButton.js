import React from 'react';
import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';

const CloseButton = (props) => {
    return (
        <button className="transition-opacity duration-100 ease-out absolute top-[36px] sm:top-10 right-8 sm:right-10 opacity-20 hover:opacity-40" onClick={props.close}>
            <CloseIcon className="w-[20px] h-[20px]" />
        </button>
    );
};

export default CloseButton;
