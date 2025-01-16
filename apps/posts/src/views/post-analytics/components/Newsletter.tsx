import * as React from 'react';
import SentList from './newsletter/SentList';
import SubNavItem from './SubNavigation';

interface newsletterProps {};

const Newsletter: React.FC<newsletterProps> = () => {
    return (
        <div className='mt-6 grid grid-cols-[auto_320px] gap-6'>
            <SentList />
            <div className='flex basis-[320px] flex-col gap-px pt-1'>
                <SubNavItem />
            </div>
        </div>
    );
};

export default Newsletter;
