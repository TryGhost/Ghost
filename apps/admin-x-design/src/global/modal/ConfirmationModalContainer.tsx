import Button from '../Button';
import ConfirmationModal, {ConfirmationModalProps} from './ConfirmationModal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';

const ConfirmationModalContainer: React.FC<ConfirmationModalProps> = ({...props}) => {
    return (
        <Button color='black' label='Open confirmation modal' onClick={() => {
            NiceModal.show(ConfirmationModal, {...props});
        }} />
    );
};

export default ConfirmationModalContainer;