import {} from '@tryghost/admin-x-framework/api/activitypub';
import NiceModal from '@ebay/nice-modal-react';
import getUsername from '../utils/get-username';
import {Avatar, Button, List, ListItem, Modal} from '@tryghost/admin-x-design-system';
import {FollowingResponseData, useBrowseFollowersForUser, useFollow} from '@tryghost/admin-x-framework/api/activitypub';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';

interface ViewFollowersModalProps {
    following: FollowingResponseData[],
    animate?: boolean
}

const ViewFollowersModal: React.FC<RoutingModalProps & ViewFollowersModalProps> = ({}) => {
    const {updateRoute} = useRouting();
    // const modal = NiceModal.useModal();
    const mutation = useFollow();

    const {data: {items = []} = {}} = useBrowseFollowersForUser('inbox');

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
                        <ListItem action={<Button color='grey' label='Follow back' link={true} onClick={() => mutation.mutate({username: getUsername(item)})} />} avatar={<Avatar image={item.icon} size='sm' />} detail={getUsername(item)} id='list-item' title={item.name}></ListItem>
                    ))}
                </List>
            </div>
        </Modal>
    );
};

export default NiceModal.create(ViewFollowersModal);
