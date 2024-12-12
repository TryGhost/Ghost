import React from 'react';
import {Icon} from '@tryghost/admin-x-design-system';

export type NotificationType = 'like' | 'follow' | 'reply';

interface NotificationIconProps {
    notificationType: NotificationType;
    className?: string;
}

const NotificationIcon: React.FC<NotificationIconProps> = ({notificationType, className}) => {
    let icon = '';
    let iconColor = '';
    let badgeColor = '';

    switch (notificationType) {
    case 'follow':
        icon = 'user';
        iconColor = 'text-blue-500';
        badgeColor = 'bg-blue-100/50';
        break;
    case 'like':
        icon = 'heart';
        iconColor = 'text-red-500';
        badgeColor = 'bg-red-100/50';
        break;
    case 'reply':
        icon = 'comment';
        iconColor = 'text-purple-500';
        badgeColor = 'bg-purple-100/50';
        break;
    }

    return (
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${badgeColor} ${className && className}`}>
            <Icon colorClass={iconColor} name={icon} size='sm' />
        </div>
    );
};

export default NotificationIcon;
