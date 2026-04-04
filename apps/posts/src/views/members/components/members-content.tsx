import React from 'react';
import {cn} from '@tryghost/shade/utils';
import {useAdminUiRedesign} from '@src/hooks/use-admin-ui-redesign';

const MembersContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    const adminUiRedesign = useAdminUiRedesign();

    return (
        <section className={cn(adminUiRedesign ? 'size-full grow min-w-0 flex flex-col gap-6 py-4 lg:py-8' : 'size-full grow min-w-0 flex flex-col gap-6 p-4 lg:p-8', className)} {...props}>
            {children}
        </section>
    );
};

export default MembersContent;
