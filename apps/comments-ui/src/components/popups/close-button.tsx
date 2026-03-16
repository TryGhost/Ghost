import React from 'react';
import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';

type Props = {
    close: () => void;
}
const CloseButton: React.FC<Props> = ({close}) => {
    return (
        <button className="absolute top-5 right-6 opacity-30 transition-opacity duration-100 ease-out hover:opacity-40 sm:top-9 sm:right-8" type="button" onClick={close}>
            <CloseIcon className="size-5 p-1 pr-0" />
        </button>
    );
};

export default CloseButton;
