import React, {forwardRef} from 'react';
import {cn} from '@tryghost/shade/utils';

const PostAnalyticsContent = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({children, className, ...props}, ref) => {
        return (
            <section ref={ref} className={cn('flex size-full grow flex-col gap-6 py-8', className)} {...props}>
                {children}
            </section>
        );
    }
);

PostAnalyticsContent.displayName = 'PostAnalyticsContent';

export default PostAnalyticsContent;
