import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';

const UnsplashModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();

    return (
        <Modal
            cancelLabel=''
            okColor='black'
            okLabel='Close'
            title="unsplash"
            onOk={() => {
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='unsplash detail'
                extra='unsplash extra'
                icon='unsplash'
                title='unsplash'
            />
        </Modal>
    );
});

export default UnsplashModal;