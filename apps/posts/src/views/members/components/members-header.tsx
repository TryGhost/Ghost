import React from 'react';
import {Header} from '@tryghost/shade';

interface MembersHeaderProps {
    children?: React.ReactNode;
    totalMembers: number;
    isLoading: boolean;
}

const MembersHeader: React.FC<MembersHeaderProps> = ({
    children,
    totalMembers,
    isLoading
}) => {
    return (
        <Header className="relative !pb-6 md:sticky" variant="inline-nav">
            <Header.Title>
                Members {!isLoading && <span className="font-normal text-muted-foreground">{totalMembers.toLocaleString()}</span>}
            </Header.Title>
            {children}
        </Header>
    );
};

export default MembersHeader;
