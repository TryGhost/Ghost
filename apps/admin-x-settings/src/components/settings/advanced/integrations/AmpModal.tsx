import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';

const AmpModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();

    return (
        <Modal
            cancelLabel=''
            okColor='black'
            okLabel='Close'
            title="amp"
            onOk={() => {
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='amp detail'
                extra='amp extra'
                icon='amp'
                title='amp'
            />
        </Modal>
    );
});

export default AmpModal;