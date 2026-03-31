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
        <ListHeader
            blurredBackground={false}
            className="relative"
            sticky={false}
        >
            <ListHeader.Left>
                <ListHeader.Title>
                    Members{' '}
                    {!isLoading && (
                        <ListHeader.Count>
                            {totalMembers.toLocaleString()}
                        </ListHeader.Count>
                    )}
                </ListHeader.Title>
            </ListHeader.Left>
            {children}
        </ListHeader>
    );
};

export default MembersHeader;
