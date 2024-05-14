import NiceModal from '@ebay/nice-modal-react';
import {Modal, TextField, showToast} from '@tryghost/admin-x-design-system';
import {useFollow} from '@tryghost/admin-x-framework/api/activitypub';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useState} from 'react';

const FollowSite = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const modal = NiceModal.useModal();
    const mutation = useFollow();

    // mutation.isPending
    // mutation.isError
    // mutation.isSuccess
    // mutation.mutate({username: '@index@site.com'})
    // mutation.reset();

    // State to manage the text field value
    const [profileName, setProfileName] = useState('');
    // const [success, setSuccess] = useState(false);
    const [errorMessage, setError] = useState(null);

    const handleFollow = async () => {
        try {
            // Perform the mutation
            await mutation.mutateAsync({username: profileName});
            // If successful, set the success state to true
            // setSuccess(true);
            showToast({
                message: 'Site followed',
                type: 'success'
            });
            modal.remove();
        } catch (error) {
            // If there's an error, set the error state
            setError(errorMessage);
        }
    };

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
            onOk={handleFollow}
            // onOk={() => {
            //     mutation.mutate({username: profileName});
            //     updateRoute('');
            //     modal.remove();
            // }}
        >
            <div className='mt-3 flex flex-col gap-4'>
                <TextField
                    autoFocus={true}
                    error={Boolean(errorMessage)}
                    hint={errorMessage}
                    placeholder='@username@hostname'
                    title='Profile name'
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                />
            </div>
        </Modal>
    );
});

export default FollowSite;
