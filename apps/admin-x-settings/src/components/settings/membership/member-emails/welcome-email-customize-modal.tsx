import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {Modal} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const WelcomeEmailCustomizeModal = NiceModal.create(() => {
    const modal = useModal();
    const {updateRoute} = useRouting();

    return (
        <Modal
            afterClose={() => {
                updateRoute('memberemails');
            }}
            cancelLabel='Close'
            okLabel='Save'
            testId='welcome-email-customize-modal'
            title='Customize welcome emails'
            onCancel={() => modal.remove()}
            onOk={() => modal.remove()}
        >
            <p className='text-grey-700'>Design customization options coming soon.</p>
        </Modal>
    );
});

export default WelcomeEmailCustomizeModal;
