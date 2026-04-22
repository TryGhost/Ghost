import React from 'react';
import {cn} from '@tryghost/shade/utils';

const AutomationsContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <section className={cn('flex gap-6 flex-col px-4 lg:px-8 py-2 size-full grow', className)} {...props}>
            {children}
        </section>
    );
};

export default AutomationsContent;
