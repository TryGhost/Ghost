import React, {forwardRef} from 'react';
import {cn} from '@tryghost/shade';

const PostAnalyticsContent = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({children, className, ...props}, ref) => {
        return (
            <section ref={ref} className={cn('flex gap-6 flex-col py-8 size-full grow', className)} {...props}>
                {children}
            </section>
        );
    }
);

PostAnalyticsContent.displayName = 'PostAnalyticsContent';

export default PostAnalyticsContent;
