import React from 'react';
import {cn} from '@tryghost/shade';

const CommentsContent: React.FC<React.HTMLAttributes<HTMLElement>> = ({children, className, ...props}) => {
    return (
        <section className={cn('flex size-full grow flex-col gap-6 p-4 lg:p-8', className)} {...props}>
            {children}
        </section>
    );
};

export default CommentsContent;
