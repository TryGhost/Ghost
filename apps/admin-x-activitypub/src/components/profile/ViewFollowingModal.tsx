import NiceModal from '@ebay/nice-modal-react';
import getUsername from '../../utils/get-username';
import {ActivityPubAPI} from '../../api/activitypub';
import {Avatar, Button, List, ListItem, Modal} from '@tryghost/admin-x-design-system';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useQuery} from '@tanstack/react-query';

function useFollowingForUser(handle: string) {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const siteUrl = siteData?.url ?? window.location.origin;
    const api = new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
    return useQuery({
        queryKey: [`following:${handle}`],
        async queryFn() {
            return api.getFollowing();
        }
    });
}

const ViewFollowingModal: React.FC<RoutingModalProps> = ({}) => {
    const {updateRoute} = useRouting();

    const {data: following = []} = useFollowingForUser('index');

    return (
        <Modal
            afterClose={() => {
                updateRoute('profile');
            }}
            cancelLabel=''
            footer={false}
            okLabel=''
            size='md'
            title='Following'
            topRightContent='close'
        >
            <div className='mt-3 flex flex-col gap-4 pb-12'>
                <List>
                    {following.map(item => (
                        <ListItem 
                            key={item.id} // Add a key prop
                            action={<Button color='grey' label='Unfollow' link={true} />} 
                            avatar={<Avatar image={item.icon} size='sm' />} 
                            detail={getUsername(item)} 
                            id='list-item' 
                            title={item.name}
                        />
                    ))}
                </List>
            </div>
        </Modal>
    );
};

export default NiceModal.create(ViewFollowingModal);
