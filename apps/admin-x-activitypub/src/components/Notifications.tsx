import MainNavigation from './ds/MainNavigation';
import React from 'react';
import {Avatar} from '@tryghost/admin-x-design-system';

interface NotificationsProps {}

const Notifications: React.FC<NotificationsProps> = ({}) => {
    return (
        <>
            <MainNavigation />
            <div className='z-0 flex w-full flex-col items-center'>
                <div className='mt-8 flex w-full max-w-[560px] flex-col'>
                    <div className='flex w-full items-center gap-2 border-b border-grey-100 pb-5'>
                        <Avatar bgColor='#FDE917' label='AV' /> Fakie Fakie started to follow you
                    </div>
                </div>
            </div>
        </>
    );
};

export default Notifications;