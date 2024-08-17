import React from 'react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Icon} from '@tryghost/admin-x-design-system';

type AvatarSize = 'sm' | 'lg';

interface APAvatarProps {
    author?: ActorProperties;
    size?: AvatarSize;
}

const APAvatar: React.FC<APAvatarProps> = ({author, size}) => {
    let avatarSize = '';

    switch (size) {
    case 'sm':
        avatarSize = ' w-10 h-10 ';
        break;
    case 'lg':
        avatarSize = ' w-22 h-22 ';
        break;
    default:
        avatarSize = ' w-10 h-10 ';
        break;
    }

    return (
        <>
            {author && author!.icon?.url ? <img className={`z-10 ${avatarSize} rounded`} src={author!.icon?.url}/> : <div className={`z-10 rounded bg-grey-100 ${avatarSize} flex items-center justify-center p-[10px]`}><Icon colorClass='text-grey-600' name='user' size={18} /></div>}
        </>
    );
};

export default APAvatar;
