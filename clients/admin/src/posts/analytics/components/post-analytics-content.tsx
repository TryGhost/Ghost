import React, { forwardRef } from 'react';
import { cn } from '@tryghost/shade/utils';

const PostAnalyticsContent = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ children, className, ...props }, ref) => {
    return (
      <section
        ref={ref}
        // Isolated, so its raised layers (chart hover cards) stay under the
        // sticky header above it
        className={cn('isolate flex size-full grow flex-col gap-6 py-8', className)}
        {...props}
      >
        {children}
      </section>
    );
  },
);

PostAnalyticsContent.displayName = 'PostAnalyticsContent';

export default PostAnalyticsContent;
