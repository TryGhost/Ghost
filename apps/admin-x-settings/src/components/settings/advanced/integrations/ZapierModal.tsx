import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';

const ZapierModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();

    return (
        <Modal
            cancelLabel=''
            okColor='black'
            okLabel='Close'
            title="Zapier"
            onOk={() => {
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='Zapier detail'
                extra='Zapier extra'
                icon='zapier'
                title='Zapier'
            />
        </Modal>
    );
});

export default ZapierModal;