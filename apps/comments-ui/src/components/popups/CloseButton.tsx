import React from 'react';
import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';

type Props = {
    close: () => void;
}
const CloseButton: React.FC<Props> = ({close}) => {
    return (
        <button className="absolute right-6 top-6 opacity-20 transition-opacity duration-100 ease-out hover:opacity-40 sm:right-8 sm:top-10" type="button" onClick={close}>
            <CloseIcon className="h-[20px] w-[20px]" />
        </button>
    );
};

export default CloseButton;
