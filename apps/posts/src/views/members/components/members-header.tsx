import React from 'react';
import {ListHeader} from '@tryghost/shade';

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
        <ListHeader className="relative pb-6! md:sticky">
            <ListHeader.Left>
                <ListHeader.Title>
                    Members{' '}
                    {!isLoading && (
                        <span className="font-normal text-muted-foreground">
                            {totalMembers.toLocaleString()}
                        </span>
                    )}
                </ListHeader.Title>
            </ListHeader.Left>
            {children}
        </ListHeader>
    );
};

export default MembersHeader;
