import React from 'react';
import {cn} from '@tryghost/shade/utils';

const StatsContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <section className={cn('flex grow flex-col items-stretch gap-6 w-full pb-8', className)} {...props}>
            {children}
        </section>
    );
};

export default StatsContent;
