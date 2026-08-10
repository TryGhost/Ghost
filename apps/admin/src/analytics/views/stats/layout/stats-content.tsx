import React from 'react';
import {cn} from '@tryghost/shade/utils';

const StatsContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <section className={cn('flex w-full grow flex-col items-stretch gap-6 pb-8', className)} {...props}>
            {children}
        </section>
    );
};

export default StatsContent;
