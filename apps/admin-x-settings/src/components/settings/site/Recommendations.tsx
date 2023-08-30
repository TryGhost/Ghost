import Avatar from '../../../admin-x-ds/global/Avatar';
import Button from '../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../admin-x-ds/global/modal/ConfirmationModal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import Table from '../../../admin-x-ds/global/Table';
import TableCell from '../../../admin-x-ds/global/TableCell';
import TableRow from '../../../admin-x-ds/global/TableRow';
import useRouting from '../../../hooks/useRouting';
// import YourRecommendationsList from './recommendations/YourRecommendationsList';

const Recommendations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openAddNewRecommendationModal = () => {
        updateRoute('recommendations/add');
    };

    const buttons = (
        <Button color='green' label='Add recommendation' link={true} onClick={() => {
            openAddNewRecommendationModal();
        }} />
    );

    const action = (
        <Button color='red' label='Remove' link onClick={() => {
            NiceModal.show(ConfirmationModal, {
                title: 'Remove recommendation',
                prompt: <>
                    <p>Your recommendation <strong>Lenny Nesletter</strong> will no longer be visible to your audience.</p>
                </>,
                okLabel: 'Remove',
                onOk: async (modal) => {
                    modal?.remove();
                }
            });
        }} />
    );

    return (
        <SettingGroup
            customButtons={buttons}
            description="Share favorite sites with your audience"
            keywords={keywords}
            navid='recommendations'
            testId='recommendations'
            title="Recommendations"
        >
            <Table hint="Readers will see your recommendations in randomized order
" hintSeparator={true}>
                <TableRow action={action} hideActions>
                    <TableCell>
                        <div className='group flex items-center gap-3 hover:cursor-pointer'>
                            <Avatar image='https://www.shesabeast.co/content/images/size/w256h256/2022/08/transparent-icon-black-copy-gray-bar.png' labelColor='white' />
                            <div className={`flex grow flex-col`}>
                                <span className='mb-0.5 font-medium'>She‘s A Beast</span>
                                <span className='text-xs leading-snug text-grey-700'>She helped me get back into the gym after 8 years of chilling</span>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
                <TableRow action={action} hideActions>
                    <TableCell>
                        <div className='group flex items-center gap-3 hover:cursor-pointer'>
                            <Avatar image='https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fc7cde267-8f9e-47fa-9aef-5be03bad95ed%2Fapple-touch-icon-1024x1024.png' labelColor='white' />
                            <div className={`flex grow flex-col`}>
                                <span className='mb-0.5 font-medium'>Lenny‘s Newsletter</span>
                                <span className='text-xs leading-snug text-grey-700'>He knows his stuff about product management and gives away lots of content for free. Highly recommended!</span>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
                <TableRow action={action} hideActions>
                    <TableCell>
                        <div className='group flex items-center gap-3 hover:cursor-pointer'>
                            <Avatar image='https://clickhole.com/wp-content/uploads/2020/05/cropped-clickhole-icon-180x180.png' labelColor='white' />
                            <div className={`flex grow flex-col`}>
                                <span className='mb-0.5 font-medium'>Clickhole</span>
                                <span className='text-xs leading-snug text-grey-700'>Funny</span>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
                <TableRow action={action} hideActions>
                    <TableCell>
                        <div className='group flex items-center gap-3 hover:cursor-pointer'>
                            <Avatar image='https://www.theverge.com/icons/apple_touch_icon.png' labelColor='white' />
                            <div className={`flex grow flex-col`}>
                                <span className='mb-0.5 font-medium'>The Verge</span>
                                <span className='text-xs leading-snug text-grey-700'>Consistently best tech news, I read it every day!</span>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
                <TableRow action={action} hideActions>
                    <TableCell>
                        <div className='group flex items-center gap-3 hover:cursor-pointer'>
                            <Avatar image='https://substackcdn.com/image/fetch/w_96,h_96,c_fill,f_webp,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ff3f2b2ad-681f-45e1-9496-db80f45e853d_403x403.png' labelColor='white' />
                            <div className={`flex grow flex-col`}>
                                <span className='mb-0.5 font-medium'>The Counteroffensive with Tim Mak</span>
                                <span className='text-xs leading-snug text-grey-700'>On-the-ground war reporting from Ukraine.</span>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            </Table>
        </SettingGroup>
    );
};

export default Recommendations;