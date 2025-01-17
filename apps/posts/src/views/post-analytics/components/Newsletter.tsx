import * as React from 'react';
import SentList from './newsletter/SentList';
import SubNavItem from './SubNavigation';

interface newsletterProps {};

const Newsletter: React.FC<newsletterProps> = () => {
    return (
        <div className='grid grow grid-cols-[auto_320px] gap-5'>
            <div className='py-5'>
                <SentList />
            </div>
            <div className='flex basis-[320px] flex-col gap-px border-l py-5 pl-5'>
                <SubNavItem>
                    <>
                        <span>Sent</span>
                        <span>1,697</span>
                    </>
                </SubNavItem>
            </div>
        </div>
    );
};

export default Newsletter;
