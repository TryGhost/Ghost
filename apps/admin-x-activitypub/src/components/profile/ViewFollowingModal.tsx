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

    const {data: items = []} = useFollowingForUser('index');

    const following = Array.isArray(items) ? items : [items];
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
                        <ListItem action={<Button color='grey' label='Unfollow' link={true} />} avatar={<Avatar image={item.icon} size='sm' />} detail={getUsername(item)} id='list-item' title={item.name}></ListItem>
                    ))}
                </List>
                {/* <Table>
                    <TableRow>
                        <TableCell>
                            <div className='group flex items-center gap-3 hover:cursor-pointer'>
                                <div className={`flex grow flex-col`}>
                                    <div className="mb-0.5 flex items-center gap-3">
                                        <img className='w-5' src='https://www.platformer.news/content/images/size/w256h256/2024/05/Logomark_Blue_800px.png'/>
                                        <span className='line-clamp-1 font-medium'>Platformer Platformer Platformer Platformer Platformer</span>
                                        <span className='line-clamp-1'>@index@platformerplatformerplatformerplatformer.news</span>
                                    </div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className='w-[1%] whitespace-nowrap'><div className='mt-1 whitespace-nowrap text-right text-sm text-grey-700'>Unfollow</div></TableCell>
                    </TableRow>
                </Table> */}
            </div>
        </Modal>
    );
};

export default NiceModal.create(ViewFollowingModal);
