import NiceModal from '@ebay/nice-modal-react';
import {Modal, TextField} from '@tryghost/admin-x-design-system';
import {useFollow} from '@tryghost/admin-x-framework/api/activitypub';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const FollowSite = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const modal = NiceModal.useModal();
    const mutation = useFollow();

    // mutation.isPending
    // mutation.isError
    // mutation.isSuccess
    // mutation.mutate({username: '@index@site.com'})
    // mutation.reset();

    return (
        <Modal
            afterClose={() => {
                mutation.reset();
                updateRoute('');
            }}
            cancelLabel='Cancel'
            okLabel='Follow'
            size='sm'
            title='Follow a Ghost site'
            onOk={() => {
                // mutation.mutate({username: value});
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
