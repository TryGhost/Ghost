import NiceModal from '@ebay/nice-modal-react';
import {Modal} from '@tryghost/admin-x-design-system';

const OfferSuccess = () => {
    return <Modal
        cancelLabel=''
        header={false}
        height='full'
        size='lg'
    >
        <h1>Success</h1>
    </Modal>;
};

export default NiceModal.create(OfferSuccess);
