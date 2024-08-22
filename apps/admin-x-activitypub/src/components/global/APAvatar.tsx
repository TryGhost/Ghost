import React from 'react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Icon} from '@tryghost/admin-x-design-system';

type AvatarSize = 'xs' | 'sm' | 'lg';

interface APAvatarProps {
    author?: ActorProperties;
    size?: AvatarSize;
}

const APAvatar: React.FC<APAvatarProps> = ({author, size}) => {
    let iconSize = 18;
    let containerClass = '';
    let imageClass = 'z-10 rounded w-10 h-10';

    switch (size) {
    case 'xs':
        iconSize = 12;
        containerClass = 'z-10 rounded bg-grey-100 flex items-center justify-center p-[3px] w-6 h-6';
        imageClass = 'z-10 rounded w-6 h-6';
        break;
    case 'sm':
        containerClass = 'z-10 rounded bg-grey-100 flex items-center justify-center p-[10px] w-10 h-10';
        break;
    case 'lg':
        containerClass = 'z-10 rounded bg-grey-100 flex items-center justify-center p-[10px] w-22 h-22';
        break;
    default:
        containerClass = 'z-10 rounded bg-grey-100 flex items-center justify-center p-[10px] w-10 h-10';
        break;
    }

    return (
        <>
            {author && author!.icon?.url ? <img className={imageClass} src={author!.icon?.url}/> : <div className={containerClass}><Icon colorClass='text-grey-600' name='user' size={iconSize} /></div>}
        </>
    );
};

export default APAvatar;
