import React from 'react';
import {ReactComponent as UserIcon} from '../assets/icons/single-user-fill.svg';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface AvatarProps {
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
    case '2xl':
        avatarSize = ' w-20 h-20 text-2xl ';
        fallbackPosition = ' -mb-3 ';
        break;
    default:
        avatarSize = ' w-10 h-10 text-md ';
        break;
    }

    return (
        <AvatarPrimitive.Root className={`relative inline-flex select-none items-center justify-center overflow-hidden rounded-full align-middle ${avatarSize}`}>
            {image ?
                <AvatarPrimitive.Image className={`absolute z-20 h-full w-full object-cover ${className && className}`} src={image} /> :
                <span className={`${labelColor && `text-${labelColor}`} relative z-10 inline-flex h-full w-full items-center justify-center p-2 font-semibold ${className && className}`} style={bgColor ? {backgroundColor: bgColor} : {}}>{label}</span>
            }
            <AvatarPrimitive.Fallback asChild>
                <UserIcon className={`${fallbackPosition} absolute z-0 h-full w-full text-grey-300`} />
            </AvatarPrimitive.Fallback>
        </AvatarPrimitive.Root>
    );
};

export default Avatar;
