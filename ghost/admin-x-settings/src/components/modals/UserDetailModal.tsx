import Modal from '../../admin-x-ds/global/Modal';
import NiceModal from '@ebay/nice-modal-react';

const UserDetailModal = NiceModal.create(() => {
    return (
        <Modal 
            size='lg'
            title='User details'
            onOk={() => {
                alert('Clicked OK'); 
            }}
        >
            <div className='py-4'>
                Some user details
            </div>
        </Modal>
    );
});

export default UserDetailModal;