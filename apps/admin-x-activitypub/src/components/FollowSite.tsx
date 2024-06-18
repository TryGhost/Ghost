import NiceModal from '@ebay/nice-modal-react';
import {Modal, TextField, showToast} from '@tryghost/admin-x-design-system';
import {useFollow} from '@tryghost/admin-x-framework/api/activitypub';
import {useQueryClient} from '@tryghost/admin-x-framework';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useState} from 'react';

// const sleep = (ms: number) => (
//     new Promise((resolve) => {
//         setTimeout(resolve, ms);
//     })
// );

const FollowSite = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const modal = NiceModal.useModal();
    const mutation = useFollow();
    const client = useQueryClient();

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

            // // Because we don't return the new follower data from the API, we need to wait a bit to let it process and then update the query.
            // // This is a dirty hack and should be replaced with a better solution.
            // await sleep(2000);

            modal.remove();
            // Refetch the following data.
            // At this point it might not be updated yet, but it will be eventually.
            await client.refetchQueries({queryKey: ['FollowingResponseData'], type: 'active'});
            updateRoute('');
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
        >
            <div className='mt-3 flex flex-col gap-4'>
                <TextField
                    autoFocus={true}
                    error={Boolean(errorMessage)}
                    hint={errorMessage}
                    placeholder='@username@hostname'
                    title='Profile name'
                    value={profileName}
                    data-test-new-follower
                    onChange={e => setProfileName(e.target.value)}
                />
            </div>
        </Modal>
    );
});

export default FollowSite;
