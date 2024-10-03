import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import getUsername from '../../utils/get-username';
import {ActivityPubAPI} from '../../api/activitypub';
import {Avatar, Button, List, ListItem, Modal} from '@tryghost/admin-x-design-system';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useQuery} from '@tanstack/react-query';

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
            const followerUrls = await api.getFollowers();
            const followerActors = await Promise.all(followerUrls.map(url => api.getActor(url)));
            return followerActors;
        }
    });
}

const ViewFollowersModal: React.FC<RoutingModalProps> = ({}) => {
    const {updateRoute} = useRouting();

    const {data: followers = [], isLoading} = useFollowersForUser('index');

    return (
        <Modal
            afterClose={() => {
                updateRoute('profile');
            }}
            cancelLabel=''
            footer={false}
            okLabel=''
            size='md'
            title='Followers'
            topRightContent='close'
        >
            <div className='mt-3 flex flex-col gap-4 pb-12'>
                {isLoading ? (
                    <p>Loading followers...</p>
                ) : (
                    <List>
                        {followers.map(item => (
                            <ListItem 
                                key={item.id}
                                action={<Button color='grey' label='Remove' link={true} />} 
                                avatar={<Avatar image={item.icon} size='sm' />} 
                                detail={getUsername(item)} 
                                id='list-item' 
                                title={item.name || getUsername(item)}
                            />
                        ))}
                    </List>
                )}
            </div>
        </Modal>
    );
};

export default NiceModal.create(ViewFollowersModal);
