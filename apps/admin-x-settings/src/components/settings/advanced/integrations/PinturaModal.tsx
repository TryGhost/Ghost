import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import {ReactComponent as Icon} from '../../../../assets/icons/pintura.svg';

const PinturaModal = NiceModal.create(() => {
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
                detail='Advanced image editing'
                icon={<Icon className='h-12 w-12' />}
                title='Pintura'
            />
        </Modal>
    );
});

export default PinturaModal;