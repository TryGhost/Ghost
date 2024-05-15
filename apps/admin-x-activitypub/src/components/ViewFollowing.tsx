import NiceModal from '@ebay/nice-modal-react';
import {Avatar, Button, List, ListItem, Modal, Table, TableCell, TableRow} from '@tryghost/admin-x-design-system';
import {useFollow} from '@tryghost/admin-x-framework/api/activitypub';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const ViewFollowing = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    // const modal = NiceModal.useModal();
    const mutation = useFollow();

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
            title='Following'
            topRightContent='close'
        >
            <div className='mt-3 flex flex-col gap-4 pb-12'>
                <List>
                    <ListItem action={<Button color='grey' label='Unfollow' link={true}/>} avatar={<Avatar image='https://www.platformer.news/content/images/size/w256h256/2024/05/Logomark_Blue_800px.png' size='sm'/>} detail='@index@platformer.news' id='list-item' title='Platformer'></ListItem>
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
});

export default ViewFollowing;
