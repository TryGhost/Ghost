import React from 'react';
import Sidebar from './Sidebar';
import {cn} from '@tryghost/shade';

const PostAnalyticsContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <section className={cn('gap-8 pb-8 grid w-full grow grid-cols-[auto_228px] xl:grid-cols-[auto_260px]', className)} {...props}>
            {/* <section className={cn('gap-8 pb-8 flex w-full flex-col', className)} {...props}> */}
            <div className='flex size-full flex-col gap-8 pt-8'>
                {children}
            </div>
            <Sidebar />
        </section>
    );
};

export default PostAnalyticsContent;
