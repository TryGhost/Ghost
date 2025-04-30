import React from 'react';
import {LucideIcon} from '@tryghost/shade';

export type NotificationType = 'like' | 'follow' | 'reply' | 'repost';
export type NotificationIconSize = 'sm' | 'lg';

interface NotificationIconProps {
    notificationType: NotificationType;
    size?: NotificationIconSize;
    className?: string;
}

const NotificationIcon: React.FC<NotificationIconProps> = ({notificationType, size = 'lg', className}) => {
    let icon;
    let badgeColor = '';
    const iconColor = 'white';
    const iconSize = size === 'sm' ? 15 : 24;
    const strokeWidth = size === 'sm' ? 2.5 : 2;

    switch (notificationType) {
    case 'follow':
        icon = <LucideIcon.UserRoundCheck className='-mr-0.5 -mt-0.5' color={iconColor} size={iconSize} strokeWidth={strokeWidth} />;
        badgeColor = 'bg-blue-700';
        break;
    case 'like':
        icon = <LucideIcon.Heart className={`${size === 'sm' ? 'size-[11px]' : 'mt-px size-6'} fill-white`} color={iconColor} />;
        badgeColor = 'bg-pink-600';
        break;
    case 'reply':
        icon = <LucideIcon.Reply className='mb-px mr-px' color={iconColor} size={iconSize} strokeWidth={strokeWidth} />;
        badgeColor = 'bg-purple-600';
        break;
    case 'repost':
        icon = <LucideIcon.Repeat2 color={iconColor} size={iconSize} strokeWidth={strokeWidth} />;
        badgeColor = 'bg-green-600';
        break;
    }

    return (
        <div className={`flex ${size === 'sm' ? 'size-6' : 'size-10'} items-center justify-center rounded-full ${badgeColor} ${className && className}`}>
            {icon}
        </div>
    );
};

export default NotificationIcon;
