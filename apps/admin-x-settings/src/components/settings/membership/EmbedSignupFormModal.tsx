import Modal from '../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import useRouting from '../../../hooks/useRouting';

const EmbedSignupFormModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const modal = useModal();

    return (
        <Modal
            afterClose={() => {
                updateRoute('embed-signup-form');
            }}
            cancelLabel=''
            okLabel='Close'
            size={540}
            testId='embed-signup-form'
            title='Embed signup form'
            onOk={() => {
                updateRoute('embed-signup-form');
                modal.remove();
            }}
        >
            Embed modal
        </Modal>
    );
});

export default EmbedSignupFormModal;
