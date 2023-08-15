import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import {ReactComponent as Icon} from '../../../../assets/icons/unsplash.svg';

const UnsplashModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();

    return (
        <Modal
            cancelLabel=''
            okColor='black'
            okLabel='Close'
            title=''
            onOk={() => {
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='Beautiful, free photos'
                icon={<Icon className='h-12 w-12' />}
                title='Unsplash'
            />
        </Modal>
    );
});

export default UnsplashModal;