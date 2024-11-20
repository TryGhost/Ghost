import NiceModal, {useModal} from '@ebay/nice-modal-react';
import {Modal} from '@tryghost/admin-x-design-system';

const NewPostModal = NiceModal.create(() => {
    const modal = useModal();

    return (
        <Modal
            cancelLabel="Cancel"
            okLabel="Post"
            size='sm'
            onCancel={() => {
                modal.remove();
            }}
            onOk={() => {
                // Handle post creation
                modal.remove();
            }}
        >
            <div className="py-4">
                <textarea
                    className="min-h-[150px] w-full rounded-md border border-grey-300 p-2"
                    placeholder="What's on your mind?"
                />
            </div>
        </Modal>
    );
});

export default NewPostModal;
