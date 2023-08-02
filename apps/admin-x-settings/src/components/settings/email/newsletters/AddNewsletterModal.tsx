import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';

interface AddNewsletterModalProps {}

const AddNewsletterModal: React.FC<AddNewsletterModalProps> = () => {
    return <Modal
        testId='add-newsletter-modal'
    >
        Hello new newsletter
    </Modal>;
};

export default NiceModal.create(AddNewsletterModal);