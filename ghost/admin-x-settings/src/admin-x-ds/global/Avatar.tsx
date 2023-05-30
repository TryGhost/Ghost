import React from 'react';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
    label?: string;
    labelColor?: string;
    bgColor?: string;
    size?: AvatarSize;
    className?: string;
}

const Avatar: React.FC<AvatarProps> = ({label, labelColor, bgColor, size, className}) => {
    let avatarSize = '';

    switch (size) {
    case 'sm':
        avatarSize = ' w-7 h-7 text-sm ';
        break;
    case 'lg':
        avatarSize = ' w-12 h-12 text-md';
        break;
    case 'xl':
        avatarSize = ' w-16 h-16 text-2xl';
        break;
    
    default:
        avatarSize = ' w-10 h-10 text-md ';
        break;
    }

    return (
        <div className={`${bgColor && `bg-${bgColor}`} ${labelColor && `text-${labelColor}`} inline-flex items-center justify-center rounded-full p-2 font-semibold ${avatarSize} ${className && className}`}>{label}</div>
    );
};

export default Avatar;