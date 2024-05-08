import NiceModal from '@ebay/nice-modal-react';
import {Modal, TextField} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const FollowSite = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const modal = NiceModal.useModal();

    return (
        <Modal
            afterClose={() => {
                updateRoute('');
            }}
            cancelLabel='Cancel'
            okLabel='Follow'
            size='sm'
            title='Follow a Ghost site'
            onOk={() => {
                updateRoute('');
                modal.remove();
            }}
        >
            <div className='mt-3 flex flex-col gap-4'>
                <TextField
                    placeholder='@username@hostname'
                    title='Profile name'
                />
            </div>
        </Modal>
    );
});

export default FollowSite;
