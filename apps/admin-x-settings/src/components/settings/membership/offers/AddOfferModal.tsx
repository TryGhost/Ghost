import NiceModal from '@ebay/nice-modal-react';
import {PreviewModalContent} from '../../../../admin-x-ds/global/modal/PreviewModal';

const AddOfferModal = () => {
    return <PreviewModalContent sidebar={<></>} title='Add Offer' />;
};

export default NiceModal.create(AddOfferModal);
