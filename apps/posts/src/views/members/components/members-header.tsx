import React from 'react';
import {ListHeader} from '@tryghost/shade/primitives';
import {cn} from '@tryghost/shade/utils';

interface MembersHeaderProps {
    children?: React.ReactNode;
    className?: string;
    totalMembers: number;
    isLoading: boolean;
}

const MembersHeader: React.FC<MembersHeaderProps> = ({
    children,
    className,
    totalMembers,
    isLoading
}) => {
    return (
        <ListHeader
            blurredBackground={false}
            className={cn('relative', className)}
            sticky={false}
        >
            <ListHeader.Left>
                <ListHeader.Title>
                    Members{' '}
                    {!isLoading && (
                        <ListHeader.Count className="hidden sm:inline">
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
