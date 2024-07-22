import NiceModal from '@ebay/nice-modal-react';
import {ActivityPubAPI} from '../api/activitypub';
import {Modal, TextField, showToast} from '@tryghost/admin-x-design-system';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useMutation} from '@tanstack/react-query';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useState} from 'react';

function useFollow(handle: string, onSuccess: () => void, onError: () => void) {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const siteUrl = siteData?.url ?? window.location.origin;
    const api = new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
    return useMutation({
        async mutationFn(username: string) {
            return api.follow(username);
        },
        onSuccess,
        onError
    });
}

const FollowSite = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const modal = NiceModal.useModal();
    const [profileName, setProfileName] = useState('');
    const [errorMessage, setError] = useState(null);

    async function onSuccess() {
        showToast({
            message: 'Site followed',
            type: 'success'
        });

        modal.remove();
        updateRoute('');
    }
    async function onError() {
        setError(errorMessage);
    }
    const mutation = useFollow('index', onSuccess, onError);

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
            onOk={() => mutation.mutate(profileName)}
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
