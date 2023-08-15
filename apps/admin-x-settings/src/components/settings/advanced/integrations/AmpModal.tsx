import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import {ReactComponent as Icon} from '../../../../assets/icons/amp.svg';

const AmpModal = NiceModal.create(() => {
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
                detail='Accelerated Mobile Pages'
                icon={<Icon className='h-14 w-14' />}
                title='AMP'
            />
        </Modal>
    );
});

export default AmpModal;