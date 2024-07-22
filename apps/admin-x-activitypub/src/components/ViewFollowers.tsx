import NiceModal from '@ebay/nice-modal-react';
import getUsername from '../utils/get-username';
import {ActivityPubAPI} from '../api/activitypub';
import {Avatar, Button, List, ListItem, Modal} from '@tryghost/admin-x-design-system';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useMutation, useQuery} from '@tanstack/react-query';

function useFollowersForUser(handle: string) {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const siteUrl = siteData?.url ?? window.location.origin;
    const api = new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
    return useQuery({
        queryKey: [`followers:${handle}`],
        async queryFn() {
            return api.getFollowers();
        }
    });
}

function useFollow(handle: string) {
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
        }
    });
}

const ViewFollowersModal: React.FC<RoutingModalProps> = ({}) => {
    const {updateRoute} = useRouting();
    // const modal = NiceModal.useModal();
    const mutation = useFollow('index');

    const {data: items = []} = useFollowersForUser('index');

    const followers = Array.isArray(items) ? items : [items];
    return (
        <Modal
            afterClose={() => {
                mutation.reset();
                updateRoute('');
            }}
            cancelLabel=''
            footer={false}
            okLabel=''
            size='md'
            title='Followers'
            topRightContent='close'
        >
            <div className='mt-3 flex flex-col gap-4 pb-12'>
                <List>
                    {followers.map(item => (
                        <ListItem action={<Button color='grey' label='Follow back' link={true} onClick={() => mutation.mutate(getUsername(item))} />} avatar={<Avatar image={item.icon} size='sm' />} detail={getUsername(item)} id='list-item' title={item.name}></ListItem>
                    ))}
                </List>
            </div>
        </Modal>
    );
};

export default NiceModal.create(ViewFollowersModal);
