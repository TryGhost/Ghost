import React from 'react';
import {cn} from '@tryghost/shade';

const PostAnalyticsContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <section className={cn('flex gap-8 flex-col py-8 size-full grow', className)} {...props}>
            {children}
        </section>
    );
};

export default PostAnalyticsContent;
