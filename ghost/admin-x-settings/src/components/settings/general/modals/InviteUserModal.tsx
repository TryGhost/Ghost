import Modal from '../../../../admin-x-ds/global/Modal';
import NiceModal from '@ebay/nice-modal-react';

const InviteUserModal = NiceModal.create(() => {
    return (
        <Modal
            size='md'
            title='Invite users'
            onOk={() => {
                // Handle invite user
            }}
        >
            <div className='py-4'>
                [TBD: invite user contents]
            </div>
        </Modal>
    );
});

export default InviteUserModal;