import IntegrationHeader from './IntegrationHeader';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import {ReactComponent as Icon} from '../../../../assets/icons/firstpromoter.svg';

const FirstpromoterModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();

    return (
        <Modal
            cancelLabel=''
            okColor='black'
            okLabel='Save'
            title=''
            onOk={() => {
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='Launch your own member referral program'
                icon={<Icon className='-mt-2 h-14 w-14' />}
                title='FirstPromoter'
            />
        </Modal>
    );
});

export default FirstpromoterModal;