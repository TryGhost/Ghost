import React, {useState} from 'react';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Icon} from '@tryghost/admin-x-design-system';

type AvatarSize = 'xs' | 'sm' | 'lg';
export type AvatarBadge = 'user-fill' | 'heart-fill' | 'comment-fill' | undefined;

interface APAvatarProps {
    author?: ActorProperties;
    size?: AvatarSize;
    badge?: AvatarBadge;
}

const APAvatar: React.FC<APAvatarProps> = ({author, size, badge}) => {
    let iconSize = 18;
    let containerClass = '';
    let imageClass = 'z-10 rounded w-10 h-10 object-cover';
    const badgeClass = `w-6 h-6 z-20 rounded-full absolute -bottom-2 -right-2 border-2 border-white content-box flex items-center justify-center `;
    let badgeColor = '';
    const [iconUrl, setIconUrl] = useState(author?.icon?.url);

    switch (badge) {
    case 'user-fill':
        badgeColor = ' bg-blue-500';
        break;
    case 'heart-fill':
        badgeColor = ' bg-red-500';
        break;
    case 'comment-fill':
        badgeColor = ' bg-purple-500';
        break;
    }

    switch (size) {
    case 'xs':
        iconSize = 12;
        containerClass = 'z-10 relative rounded bg-grey-100 shrink-0 flex items-center justify-center w-6 h-6';
        imageClass = 'z-10 rounded w-6 h-6 object-cover';
        break;
    case 'sm':
        containerClass = 'z-10 relative rounded bg-grey-100 shrink-0 flex items-center justify-center w-10 h-10';
        break;
    case 'lg':
        containerClass = 'z-10 relative rounded-xl bg-grey-100 shrink-0 flex items-center justify-center w-22 h-22';
        imageClass = 'z-10 rounded-xl w-22 h-22 object-cover';
        break;
    default:
        containerClass = 'z-10 relative rounded bg-grey-100 shrink-0 flex items-center justify-center w-10 h-10';
        break;
    }

    if (iconUrl) {
        return (
            <a className={containerClass} href={author?.url} rel='noopener noreferrer' target='_blank'>
                <img
                    className={imageClass}
                    src={iconUrl}
                    onError={() => setIconUrl(undefined)}
                />
                {badge && (
                    <div className={`${badgeClass} ${badgeColor}`}>
                        <Icon
                            colorClass='text-white'
                            name={badge}
                            size='xs'
                        />
                    </div>
                )}
            </a>
        );
    }

    return (
        <div className={containerClass}>
            <Icon
                colorClass='text-grey-600'
                name='user'
                size={iconSize}
            />
        </div>
    );
};

export default APAvatar;
