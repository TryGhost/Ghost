import NiceModal from '@ebay/nice-modal-react';
import {PreviewModalContent} from '../../../../admin-x-ds/global/modal/PreviewModal';

const EditOfferModal = () => {
    return <PreviewModalContent sidebar={<></>} title='Edit Offer' />;
};

export default NiceModal.create(EditOfferModal);
