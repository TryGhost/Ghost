import React from 'react';
import Sidebar from './Sidebar';
import {cn} from '@tryghost/shade';

const StatsContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <section className={cn('gap-8 pb-8 grid w-full grow grid-cols-[auto_288px]', className)} {...props}>
            <div className='flex size-full flex-col gap-8'>
                {children}
            </div>
            <Sidebar />
        </section>
    );
};

export default StatsContent;
