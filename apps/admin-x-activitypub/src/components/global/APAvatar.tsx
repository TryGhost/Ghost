import React from 'react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Icon} from '@tryghost/admin-x-design-system';

interface APAvatarProps {
    author?: ActorProperties;
}

const APAvatar: React.FC<APAvatarProps> = ({author}) => {
    return (
        <>
            {author && author!.icon?.url ? <img className='z-10 w-10 rounded' src={author!.icon?.url}/> : <div className='z-10 rounded bg-grey-100 p-[10px]'><Icon colorClass='text-grey-600' name='user' size={18} /></div>}
        </>
    );
};

export default APAvatar;
