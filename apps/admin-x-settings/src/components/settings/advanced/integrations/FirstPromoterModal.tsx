import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';

const FirstpromoterModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();

    return (
        <Modal
            cancelLabel=''
            okColor='black'
            okLabel='Close'
            title="firstpromoter"
            onOk={() => {
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='firstpromoter detail'
                extra='firstpromoter extra'
                icon='firstpromoter'
                title='firstpromoter'
            />
        </Modal>
    );
});

export default FirstpromoterModal;