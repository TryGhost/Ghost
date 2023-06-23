import React from 'react';
import {ReactComponent as UserIcon} from '../assets/icons/single-user-fill.svg';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
    image?: string;
    label?: string;

    /**
     * Accepts any valid Tailwindcolor e.g. `black`, `green`
     */
    labelColor?: string;

    /**
     * Accepts any valid CSS value e.g. #ffca03
     */
    bgColor?: string;
    size?: AvatarSize;
    className?: string;
}

const Avatar: React.FC<AvatarProps> = ({image, label, labelColor, bgColor, size, className}) => {
    let avatarSize = '';
    let fallbackPosition = ' -mb-2 ';

    switch (size) {
    case 'sm':
        avatarSize = ' w-7 h-7 text-sm ';
        break;
    case 'lg':
        avatarSize = ' w-12 h-12 text-xl ';
        break;
    case 'xl':
        avatarSize = ' w-16 h-16 text-2xl ';
        fallbackPosition = ' -mb-3 ';
        break;
    default:
        avatarSize = ' w-10 h-10 text-md ';
        break;
    }

    if (image) {
        return (
            <img alt="" className={`inline-flex items-center justify-center rounded-full object-cover font-semibold ${avatarSize} ${className && className}`} src={image}/>
        );
    } else if (label) {
        return (
            <div className={`${labelColor && `text-${labelColor}`} inline-flex items-center justify-center rounded-full p-2 font-semibold ${avatarSize} ${className && className}`} style={bgColor ? {backgroundColor: bgColor} : {}}>{label}</div>
        );
    } else {
        return (
            <div className={`inline-flex items-center justify-center overflow-hidden rounded-full bg-grey-100 p-1 font-semibold ${avatarSize} ${className && className}`}>
                <UserIcon className={`${fallbackPosition} h-full w-full  text-grey-300`} />
            </div>
        );
    }
};

export default Avatar;