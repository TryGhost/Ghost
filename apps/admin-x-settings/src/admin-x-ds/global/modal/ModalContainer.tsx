import NiceModal from '@ebay/nice-modal-react';
import React from 'react';

import Button from '../Button';
import Modal, {ModalProps} from './Modal';

const ModalContainer: React.FC<ModalProps> = ({children, onCancel, ...props}) => {
    const modal = NiceModal.create<ModalProps>(() => {
        return (
            <Modal {...props}>
                <div className='py-4'>
                    {children}
                </div>
            </Modal>
        );
    });
    return (
        <div>
            <Button color='black' label='Open modal' onClick={() => {
                NiceModal.show(modal);
            }} />
        </div>
    );
};

export default ModalContainer;