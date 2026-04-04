import React from 'react';
import {ListHeader} from '@tryghost/shade/primitives';
import {cn} from '@tryghost/shade/utils';
import {useAdminUiRedesign} from '@src/hooks/use-admin-ui-redesign';

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
    const adminUiRedesign = useAdminUiRedesign();

    return (
        <ListHeader
            blurredBackground={false}
            className={cn('relative', adminUiRedesign ? className : undefined)}
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
