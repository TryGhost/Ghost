import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';

const SlackModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();

    return (
        <Modal
            cancelLabel=''
            okColor='black'
            okLabel='Close'
            title="slack"
            onOk={() => {
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='slack detail'
                extra='slack extra'
                icon='slack'
                title='slack'
            />
        </Modal>
    );
});

export default SlackModal;