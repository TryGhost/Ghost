import React from 'react';
import {cn} from '@tryghost/shade';

const MembersContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <section className={cn('size-full grow min-w-0 flex flex-col gap-6 p-4 lg:p-8', className)} {...props}>
            {children}
        </section>
    );
};

export default MembersContent;
