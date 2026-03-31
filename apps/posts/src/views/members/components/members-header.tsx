import React from 'react';
import {Header} from '@tryghost/shade';

interface MembersHeaderProps {
    children?: React.ReactNode;
    totalMembers: number;
    isLoading: boolean;
}

const MembersHeader = React.forwardRef<HTMLElement, MembersHeaderProps>(function MembersHeader({
    children,
    totalMembers,
    isLoading
}, ref) {
    return (
        <Header
            ref={ref}
            className="relative static! top-auto! z-auto! mb-0! bg-transparent! p-0! backdrop-blur-none!"
            variant="inline-nav"
        >
            <Header.Title>
                Members{' '}
                {!isLoading && (
                    <span className="font-normal text-muted-foreground">
                        {totalMembers.toLocaleString()}
                    </span>
                )}
            </Header.Title>
            {children}
        </Header>
    );
});

export default MembersHeader;
