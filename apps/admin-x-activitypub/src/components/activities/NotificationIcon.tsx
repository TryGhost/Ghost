import React from 'react';
import {Icon} from '@tryghost/admin-x-design-system';

export type NotificationType = 'like' | 'follow' | 'reply';

interface NotificationIconProps {
    notificationType: 'like' | 'follow' | 'reply';
    className?: string;
}

const NotificationIcon: React.FC<NotificationIconProps> = ({notificationType, className}) => {
    let icon = '';
    let iconColor = '';
    let badgeColor = '';

    switch (notificationType) {
    case 'follow':
        icon = 'user-fill';
        iconColor = 'text-blue-500';
        badgeColor = 'bg-blue-100';
        break;
    case 'like':
        icon = 'heart-fill';
        iconColor = 'text-red-500';
        badgeColor = 'bg-red-100';
        break;
    case 'reply':
        icon = 'comment-fill';
        iconColor = 'text-purple-500';
        badgeColor = 'bg-purple-100';
        break;
    }

    return (
        <div className={`flex h-6 w-6 items-center justify-center rounded-md ${badgeColor} ${className}`}>
            <Icon colorClass={iconColor} name={icon} size='xs' />
        </div>
    );
};

export default NotificationIcon;
