import NiceModal from '@ebay/nice-modal-react';
import {Modal, TextField} from '@tryghost/admin-x-design-system';
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
    const [success, setSuccess] = useState(false);
    const [errorMessage, setError] = useState(null);

    const handleFollow = async () => {
        try {
            // Perform the mutation
            await mutation.mutateAsync(profileName);
            // If successful, set the success state to true
            setSuccess(true);
            console.log('Successfully followed!');
            // Reset the input field
            setProfileName('');
            // Close the modal after a short delay
            setTimeout(() => {
                modal.remove();
            }, 1000);
        } catch (error) {
            // If there's an error, set the error state
            setError(error.message);
        }
    };

    return (
        <Modal
            afterClose={() => {
                mutation.reset();
                updateRoute('');
            }}
            buttonsDisabled={!profileName || mutation.isLoading}
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
                    placeholder='@username@hostname'
                    title='Profile name'
                    // Set the value of the text field to the state variable
                    value={profileName}
                    // Update the state variable when the text field changes
                    onChange={e => setProfileName(e.target.value)}
                />
                {/* Display success message if the mutation was successful */}
                {success && <p className="text-green-600">Followed successfully!</p>}
                {/* Display error message if there was an error */}
                {errorMessage && <p className="text-red-600">{errorMessage}</p>}
            </div>
        </Modal>
    );
});

export default FollowSite;
