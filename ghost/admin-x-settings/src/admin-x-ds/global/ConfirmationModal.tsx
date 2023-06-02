import Modal from './Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';

export interface ConfirmationModalProps {
    title?: string;
    prompt?: React.ReactNode;
    cancelLabel?: string;
    okLabel?: string;
    okColor?: string;
    onCancel?: () => void;
    onOk?: () => void;
    customFooter?: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    title = 'Are you sure?', 
    prompt,
    cancelLabel = 'Cancel', 
    okLabel = 'OK', 
    okColor = 'black',
    onCancel, 
    onOk, 
    customFooter
}) => {
    return (
        <Modal 
            backDrop={false}
            cancelLabel={cancelLabel}
            customFooter={customFooter}
            okColor={okColor}
            okLabel={okLabel}
            size={540}
            title={title}
            onCancel={onCancel}
            onOk={onOk}
        >
            <div className='py-4'>
                {prompt}
            </div>
        </Modal>
    );
};

export default NiceModal.create(ConfirmationModal);