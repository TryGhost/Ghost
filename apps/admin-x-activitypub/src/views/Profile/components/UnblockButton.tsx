import React, {useState} from 'react';
import UnblockDialog from './UnblockDialog';
import {Account} from '@src/api/activitypub';
import {Button} from '@tryghost/shade';

interface UnblockButtonProps {
    account: Account,
    onUnblock: () => void;
    onDomainUnblock: () => void;
    className?: string;
}

const UnblockButton: React.FC<UnblockButtonProps> = ({
    account,
    onUnblock,
    onDomainUnblock,
    className = ''
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const trigger = (
        <Button
            className={`min-w-[90px] ${className}`}
            variant='destructive'
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isHovered ? 'Unblock' : 'Blocked'}
        </Button>
    );

    return (
        <UnblockDialog
            handle={account.handle}
            isDomainBlocked={account.domainBlockedByMe}
            isUserBlocked={account.blockedByMe}
            trigger={trigger}
            onUnblockDomain={onDomainUnblock}
            onUnblockUser={onUnblock}
        />
    );
};

export default UnblockButton;
