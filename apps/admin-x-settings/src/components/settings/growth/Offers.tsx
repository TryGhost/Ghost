import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {CopyLinkButton} from './offers/OffersIndex';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const Offers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings, config} = useGlobalData();

    const openModal = () => {
        updateRoute('offers/edit');
    };

    return (
        <TopLevelGroup
            customButtons={<Button color='green' disabled={!checkStripeEnabled(settings, config)} label='Manage offers' link linkWithPadding onClick={openModal}/>}
            description={<>Grow your audience by providing fixed or percentage discounts. <a className='text-green' href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">Learn more</a></>}
            keywords={keywords}
            navid='offers'
            testId='offers'
            title='Offers'
        >
            <div>
                <div className='grid grid-cols-3 gap-4'>
                    <div className='group flex aspect-square cursor-pointer flex-col justify-between break-words rounded-sm border border-transparent bg-grey-100 p-5 transition-all hover:border-grey-100 hover:bg-grey-75 hover:shadow-sm dark:bg-grey-950 dark:hover:border-grey-800'>
                        <span className='text-[1.65rem] font-bold leading-tight tracking-tight'>Black Friday</span>
                        <div className='flex flex-col'>
                            <span className='text-sm font-semibold uppercase text-green'>20% off</span>
                            <div className='flex gap-1 text-xs'>
                                <span className='font-semibold'>Bronze</span>
                                <span className='text-grey-700'>monthly</span>
                            </div>
                            <div className='mt-2 flex items-end justify-between'>
                                <a className='text-xs text-grey-700 hover:text-black hover:underline' href="#">4 redemptions</a>
                                <CopyLinkButton offerCode='' />
                            </div>
                        </div>
                    </div>
                    <div className='group flex aspect-square cursor-pointer flex-col justify-between break-words rounded-sm border border-transparent bg-grey-100 p-5 transition-all hover:border-grey-100 hover:bg-grey-75 hover:shadow-sm dark:bg-grey-950 dark:hover:border-grey-800'>
                        <span className='text-[1.65rem] font-bold leading-tight tracking-tight'>Cyber Monday</span>
                        <div className='flex flex-col'>
                            <span className='text-sm font-semibold uppercase text-pink'>7 days free</span>
                            <div className='flex gap-1 text-xs'>
                                <span className='font-semibold'>Silver</span>
                                <span className='text-grey-700'>yearly</span>
                            </div>
                            <div className='mt-2 flex items-end justify-between'>
                                <a className='text-xs text-grey-700 hover:text-black hover:underline' href="#">0 redemptions</a>
                                <CopyLinkButton offerCode='' />
                            </div>
                        </div>
                    </div>
                    <div className='group flex aspect-square cursor-pointer flex-col justify-between break-words rounded-sm border border-transparent bg-grey-100 p-5 transition-all hover:border-grey-100 hover:bg-grey-75 hover:shadow-sm dark:bg-grey-950 dark:hover:border-grey-800'>
                        <span className='text-[1.65rem] font-bold leading-tight tracking-tight'>Great Deal</span>
                        <div className='flex flex-col'>
                            <span className='text-sm font-semibold uppercase text-blue'>$20 off</span>
                            <div className='flex gap-1 text-xs'>
                                <span className='font-semibold'>Bronze</span>
                                <span className='text-grey-700'>yearly</span>
                            </div>
                            <div className='mt-2 flex items-end justify-between'>
                                <a className='text-xs text-grey-700 hover:text-black hover:underline' href="#">3 redemptions</a>
                                <CopyLinkButton offerCode='' />
                            </div>
                        </div>
                    </div>
                </div>
                <div className='mt-4 border-t border-t-grey-200 pt-2'>
                    <Button className='text-sm font-bold text-green' label='Show all' size='sm' link unstyled onClick={openModal} />
                </div>
            </div>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Offers, 'Portal settings');
