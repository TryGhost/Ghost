import React from 'react';
import {cn} from '@tryghost/shade';

const MembersContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <section className={cn('flex gap-6 flex-col p-4 lg:p-8 size-full grow', className)} {...props}>
            {children}
        </section>
    );
};

export default MembersContent;
