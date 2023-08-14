import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';

const PinturaModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();

    return (
        <Modal
            cancelLabel=''
            okColor='black'
            okLabel='Close'
            title="pintura"
            onOk={() => {
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='pintura detail'
                extra='pintura extra'
                icon='pintura'
                title='pintura'
            />
        </Modal>
    );
});

export default PinturaModal;